const z = require("zod");
const {queryVotingRoundConsensus} = require("../../lib/votes-graphql");
const EWXNRLogger = require("../../lib/log");

module.exports = function (RED) {
    const axios = require('axios');
    const z = require('zod');

    const ConsensusStatus = {
        SETTLED: 'SETTLED', EXPIRED: 'EXPIRED', IN_PROGRESS: 'IN_PROGRESS', FAILED: 'FAILED',
    };

    const MSG_SCHEMA = z.object({
        votingRoundId: z.string().min(1).max(64), waitForVotingRound: z.number().positive().default(6 * 12 * 1000),
    });

    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        node.ewxConfig = RED.nodes.getNode(config.ewxConfig);

        const logger = new EWXNRLogger('Consensus', {}, node, true);

        node.on('input', async function (msg, send, done) {
            try {
                await node.ewxConfig.ready;

                const parsed = MSG_SCHEMA.parse(msg.payload);

                const start = Date.now();

                while (parsed.waitForVotingRound + start > Date.now()) {
                    logger.info('querying voting round', {
                        votingRoundId: parsed.votingRoundId,
                        solutionNamespace: node.ewxConfig.solutionNamespace,
                    });

                    const response = await queryVotingRoundConsensus(node, parsed.votingRoundId, node.ewxConfig.solutionNamespace)
                        .then((response) => {
                            if (response.status !== 200) {
                                const currentDate = Date.now();

                                logger.error('non 200 status code', {
                                    solutionNamespace: node.ewxConfig.solutionNamespace,
                                    response: response.data,
                                    responseStatus: response.status,
                                    contentType: response.headers['content-type'],
                                    votingRoundId: parsed.votingRoundId,
                                    waitForVotingRound: parsed.waitForVotingRound,
                                    elapsedMs: currentDate - start,
                                    elapsedSeconds: (currentDate- start) / 1000,
                                    elapsedMinutes: (currentDate - start) / 1000 / 60,
                                });

                                return null;
                            }

                            return response.data.data.votingRounds;
                        })
                        .catch((e) => {
                            const currentDate = Date.now();

                            logger.error('failed during fetching data', {
                                solutionNamespace: node.ewxConfig.solutionNamespace,
                                votingRoundId: parsed.votingRoundId,
                                waitForVotingRound: parsed.waitForVotingRound,
                                elapsedMs: currentDate - start,
                                elapsedSeconds: (currentDate - start) / 1000,
                                elapsedMinutes: (currentDate - start) / 1000 / 60,
                                errorResponse: e.response?.data,
                                errorStatus: e.response?.status,
                                errorHeaders: e.response?.headers,
                            });

                            logger.error(e);

                            return null;
                        });

                    if (response == null) {
                        logger.info('waiting for voting round to be created, no response', {
                            solutionNamespace: node.ewxConfig.solutionNamespace,
                            votingRoundId: parsed.votingRoundId,
                            waitForVotingRound: parsed.waitForVotingRound,
                        });

                        await new Promise((resolve) => setTimeout(resolve, 6000));

                        continue;
                    }

                    if (response.length === 0) {
                        logger.info('waiting for voting round to be created, empty array', {
                            solutionNamespace: node.ewxConfig.solutionNamespace,
                            votingRoundId: parsed.votingRoundId,
                            waitForVotingRound: parsed.waitForVotingRound,
                        });

                        await new Promise((resolve) => setTimeout(resolve, 6000));

                        continue;
                    }

                    const votingRound = response[0];

                    if (votingRound.settled) {
                        const possibleLeaders = votingRound.votes.filter((vote) => vote.result.result === votingRound.result);

                        if (possibleLeaders.length === 0) {
                            logger.error('unexpected behavior');

                            send({
                                payload: {
                                    ... msg.payload,
                                    votingRoundId: parsed.votingRoundId,
                                    waitForVotingRound: parsed.waitForVotingRound,
                                    leaderAddress: null,
                                    consensusStatus: ConsensusStatus.FAILED,
                                    attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                                    shouldRetry: false,
                                    result: null
                                }
                            });

                            done();

                            return;
                        }

                        const electedLeader = possibleLeaders[0];

                        logger.info('voting round settled', {
                            electedLeader,
                            solutionNamespace: node.ewxConfig.solutionNamespace,
                            votingRoundId: parsed.votingRoundId,
                            waitForVotingRound: parsed.waitForVotingRound,
                            result: votingRound.result,
                        });

                        send({
                            payload: {
                                ... msg.payload,
                                votingRoundId: parsed.votingRoundId,
                                waitForVotingRound: parsed.waitForVotingRound,
                                leaderAddress: electedLeader.worker.id,
                                consensusStatus: ConsensusStatus.SETTLED,
                                attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                                shouldRetry: false,
                                result: votingRound.result,
                            }
                        });

                        done();

                        return;
                    } else if (votingRound.expired) {
                        logger.info('voting round expired', {
                            solutionNamespace: node.ewxConfig.solutionNamespace,
                            votingRoundId: parsed.votingRoundId,
                            waitForVotingRound: parsed.waitForVotingRound,
                        });

                        send({
                            payload: {
                                ... msg.payload,
                                votingRoundId: parsed.votingRoundId,
                                waitForVotingRound: parsed.waitForVotingRound,
                                leaderAddress: null,
                                consensusStatus: ConsensusStatus.EXPIRED,
                                attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                                shouldRetry: false,
                                result: null
                            }
                        })

                        done();

                        return;
                    } else {
                        logger.info('voting round in progress', {
                            solutionNamespace: node.ewxConfig.solutionNamespace,
                            votingRoundId: parsed.votingRoundId,
                            waitForVotingRound: parsed.waitForVotingRound,
                        });

                        send({
                            payload: {
                                ... msg.payload,
                                votingRoundId: parsed.votingRoundId,
                                waitForVotingRound: parsed.waitForVotingRound,
                                leaderAddress: null,
                                consensusStatus: ConsensusStatus.IN_PROGRESS,
                                attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                                shouldRetry: true,
                                result: null
                            }
                        })

                        await new Promise((resolve) => setTimeout(resolve, 12000));

                        done();

                        return;
                    }
                }
            } catch (e) {
                console.error('invalid message payload', e, msg.payload);
                node.error(`invalid message payload: ${e.message}`);

                send({
                    payload: {
                        ... msg.payload,
                        leaderAddress: null,
                        consensusStatus: ConsensusStatus.FAILED,
                        attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                        shouldRetry: false,
                        result: null
                    }
                });
            }
        });
    }

    RED.nodes.registerType("consensus", NodeConstructor);
}
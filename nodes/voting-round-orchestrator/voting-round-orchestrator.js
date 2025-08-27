const z = require("zod");
const {getLatestVotingRoundId} = require("../../lib/voting-round-orchestrator");
const EWXNRLogger = require("../../lib/log");

module.exports = function (RED) {
    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        node.ewxConfig = RED.nodes.getNode(config.ewxConfig);

        const logger = new EWXNRLogger('VotingRoundOrchestrator', {}, node, true);

        node.on('input', async function (msg, send, done) {
            await node.ewxConfig.ready;

            await getLatestVotingRoundId(node)
                .then((response) => {
                    if(response.status === 404) {
                        logger.warn(`no eligible voting round found`, {
                            solutionNamespace: node.ewxConfig.solutionNamespace,
                            response: response.data,
                            responseStatus: response.status,
                            contentType: response.headers['content-type'],
                        });

                        send({
                            payload: {
                                ... msg.payload,
                                votingRoundId: null,
                            }
                        });

                        done();

                        return;
                    }

                    if (response.status !== 200) {
                        logger.warn(`failed to fetch latest voting round id`, {
                            solutionNamespace: node.ewxConfig.solutionNamespace,
                            response: response.data,
                            responseStatus: response.status,
                            contentType: response.headers['content-type'],
                        });

                        send({
                            payload: {
                                ... msg.payload,
                                votingRoundId: null,
                            }
                        });

                        done();

                        return;
                    }

                    if (!response.data.votingRoundId) {
                       logger.error(`no voting round id returned`, {});

                        send({
                            payload: {
                                ... msg.payload,
                                votingRoundId: null,
                            }
                        });

                        return;
                    }

                    logger.info(`latest voting round id`, {
                        votingRoundId: response.data.votingRoundId,
                    });

                    send({
                        payload: {
                            ... msg.payload,
                            votingRoundId: response.data.votingRoundId,
                        }
                    });
                })
        });
    }

    RED.nodes.registerType("voting-round-orchestrator", NodeConstructor);
}
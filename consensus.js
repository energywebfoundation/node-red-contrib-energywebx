module.exports = function (RED) {
    const axios = require('axios');

    const ConsensusStatus = {
        NOT_ENOUGH_VOTES: 'NOT_ENOUGH_VOTES',
        REACHED: 'REACHED',
        UNABLE_TO_REACH_CONSENSUS: 'UNABLE_TO_REACH_CONSENSUS',
        FAILED: 'FAILED'
    };

    const gqlQuery = `
        query GetSubmittedResults($solutionNamespace: String!, $votingRoundId: String!, $solutionGroupId: String!, $limit: Int!, $offset: Int!) {
  solutionResultSubmitteds(where: {solution: {id_eq: $solutionNamespace}votingRoundId_eq: $votingRoundId, successful_eq: true}, orderBy: blockNumber_ASC, limit: $limit, offset: $offset) {
    result
    worker {
      id
    }
  }
  operatorSubscribedSolutionGroups(where: {solutionGroup: {id_eq: $solutionGroupId}}, limit: $limit, offset: $offset) {
    operator {
      id
      mappings {
        worker {
          id
        }
      }
    }
  }
}    
    `;
    const getKeyWithHighestNumber = (obj) =>

        Object.keys(obj).reduce((a, b) => (obj[a] > obj[b] ? a : b));

    function NodeConstructor(config) {
        this.ewxConfig = RED.nodes.getNode(config.ewxConfig);

        RED.nodes.createNode(this, config);

        var node = this;

        node.on('input', async function (msg, send, done) {
            if (!msg.payload.votingRoundId) {
                this.status({fill: "red", shape: "dot", text: "votingRoundId is missing"});

                node.error("votingRoundId is missing");

                return;
            }

            let electedLeader = null;

            let page = 0;
            const limit = 50;

            const resultCounts = {};
            const operatorsMapping = {};
            const submittedResults = [];

            while (true) {
                const response = await axios.post(node.ewxConfig.subsquidUrl, {
                    query: gqlQuery,
                    variables: {
                        votingRoundId: msg.payload.votingRoundId,
                        solutionGroupId: node.ewxConfig.solutionGroupId,
                        solutionNamespace: node.ewxConfig.solutionNamespace,
                        limit,
                        offset: (page * limit)
                    }
                }).catch((e) => {
                    console.error(`failed during fetching data, solution: ${node.ewxConfig.solutionNamespace}`, e, e.response?.data);
                    this.status({fill: "red", shape: "dot", text: "failed to query data"});

                    return null;
                });

                if (response === null) {
                    send({
                        payload: {
                            leaderAddress: null,
                            consensusStatus: ConsensusStatus.FAILED,
                            attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                            shouldRetry: true,
                            result: null
                        }
                    });

                    done();

                    return;
                }

                const {data} = response;

                const {solutionResultSubmitteds, operatorSubscribedSolutionGroups} = data.data;

                if (solutionResultSubmitteds.length === 0 && operatorSubscribedSolutionGroups.length === 0) {
                    break;
                }

                submittedResults.push(...solutionResultSubmitteds);

                for (const {operator} of operatorSubscribedSolutionGroups) {
                    if (operatorsMapping[operator.id]) {
                        continue;
                    }

                    const mappings = operator.mappings;

                    if (mappings.length === 0) {
                        continue;
                    }

                    operatorsMapping[operator.id] = mappings[0].worker.id;
                }

                page++;
            }

            this.log(`votingRoundId = ${msg.payload.votingRoundId} - finished fetching consensus data`);

            const applicableOperatorsCount = Object.entries(operatorsMapping).length;

            if (applicableOperatorsCount < 3) {
                this.log(`votingRoundId = ${msg.payload.votingRoundId} - not enough operators for consensus`);
                this.status({fill: "red", shape: "dot", text: "not enough operators"});

                send({
                    payload: {
                        leaderAddress: null,
                        consensusStatus: ConsensusStatus.FAILED,
                        attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                        shouldRetry: false,
                        result: null
                    }
                });

                return done();
            }

            const hasAnyVotes = submittedResults.length > 0;

            if (!hasAnyVotes) {
                this.log(`votingRoundId = ${msg.payload.votingRoundId} - not enough votes for consensus`);

                this.status({fill: "yellow", shape: "dot", text: "not enough votes"});

                send({
                    payload: {
                        leaderAddress: null,
                        consensusStatus: ConsensusStatus.NOT_ENOUGH_VOTES,
                        attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                        shouldRetry: true,
                        result: null
                    }
                });

                return done();
            }


            const minVotesRequired = applicableOperatorsCount / 2 + 0.5;

            for (const {result, worker} of submittedResults) {
                resultCounts[result] = (resultCounts[result] || 0) + 1;

                if (resultCounts[result] >= minVotesRequired && electedLeader == null) {
                    electedLeader = worker.id;
                }
            }

            if (electedLeader) {
                this.log(`votingRoundId = ${msg.payload.votingRoundId} - reached consensus`);

                this.status({fill: "green", shape: "dot", text: "reached"});
                const resultHash = getKeyWithHighestNumber(resultCounts);

                send({
                    payload: {
                        leaderAddress: electedLeader,
                        consensusStatus: ConsensusStatus.REACHED,
                        attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                        shouldRetry: false,
                        resultHash
                    }
                });

                return done();
            }

            const highestVote = resultCounts[getKeyWithHighestNumber(resultCounts)];

            const remainingVotes = applicableOperatorsCount - submittedResults.length;

            const canStillReachConsensus = highestVote + remainingVotes >= minVotesRequired;

            if (!canStillReachConsensus) {
                this.status({fill: "red", shape: "dot", text: "unable to reach"});
                this.log(`votingRoundId = ${msg.payload.votingRoundId} - unable to reach consensus`);

                send({
                    payload: {
                        leaderAddress: null,
                        consensusStatus: ConsensusStatus.UNABLE_TO_REACH_CONSENSUS,
                        attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                        shouldRetry: false,
                        result: null
                    }
                });

                return done();
            } else {
                this.status({fill: "yellow", shape: "dot", text: "not enough votes"});
                this.log(`votingRoundId = ${msg.payload.votingRoundId} - not enough votes`);


                send({
                    payload: {
                        leaderAddress: null,
                        consensusStatus: ConsensusStatus.NOT_ENOUGH_VOTES,
                        attempt: msg.payload.attempt ? msg.payload.attempt + 1 : 1,
                        shouldRetry: true,
                        result: null
                    }
                });

                return done();
            }
        });
    }

    RED.nodes.registerType("consensus", NodeConstructor);
}
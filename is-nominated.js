module.exports = function (RED) {
    const axios = require('axios');

    function NodeConstructor(config) {
        this.ewxConfig = RED.nodes.getNode(config.ewxConfig);

        RED.nodes.createNode(this, config);

        var node = this;

        node.on('input', function (msg, send, done) {
           if(!msg.payload.votingRoundId) {
               console.error(`no voting round specified for solution = ${node.ewxConfig.solutionNamespace}`);

               this.status({fill: "red", shape: "ring", text: "no voting round specified"});

               send({
                   payload: {
                       isNominated: null,
                   }
               });

               return;
           }

            const requestPayload = {
                query: `
                    query IsWorkerNominated($workerAddress: String!, $solutionNamespace: String!, $votingRoundId: String!) {
                      votingRoundNominatedWorkersSnapshots(where: {worker: {id_eq: $workerAddress}, votingRound:{votingRoundId_eq: $votingRoundId, solution: {id_eq: $solutionNamespace}}}) {
                        id
                        votingRound {
                          id
                        }
                      }
                    }
                    
                    `,
                variables: {
                    workerAddress: node.ewxConfig.workerAddress,
                    solutionNamespace: node.ewxConfig.solutionNamespace,
                    votingRoundId: msg.payload.votingRoundId,
                }
            };

            const url = node.ewxConfig.baseUrls.base_indexer_url + '/votes/graphql';

            axios.post(url, requestPayload)
                .then((response) => {
                    const {votingRoundNominatedWorkersSnapshots} = response.data.data;

                    if (votingRoundNominatedWorkersSnapshots.length > 0) {
                        this.status({fill: "green", shape: "dot", text: "nominated"});
                        this.log(`workerAddress = ${node.ewxConfig.workerAddress} - worker is nominated`);

                        send({
                            payload: {
                                isNominated: true,
                            }
                        });
                    } else {
                        this.status({fill: "yellow", shape: "dot", text: "not nominated"});
                        this.log(`workerAddress = ${node.ewxConfig.workerAddress} - worker is not nominated`);

                        send({
                            payload: {
                                isNominated: false,
                            }
                        });
                    }
                })
                .catch((e) => {
                    console.error(`failed to obtain nominations for solution = ${node.ewxConfig.solutionNamespace}`, e, e.response?.data);

                    this.status({fill: "red", shape: "ring", text: "failed to obtain data"});

                    send({
                        payload: {
                            isNominated: null,
                        }
                    });
                })
        });
    }

    RED.nodes.registerType("is-nominated", NodeConstructor);
}
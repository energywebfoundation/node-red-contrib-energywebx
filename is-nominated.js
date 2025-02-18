module.exports = function (RED) {
    const axios = require('axios');

    function NodeConstructor(config) {
        this.ewxConfig = RED.nodes.getNode(config.ewxConfig);

        RED.nodes.createNode(this, config);

        var node = this;

        node.on('input', function (msg, send, done) {
            const requestPayload = {
                query: `query IsWorkerNominated($workerAddress: String!, $solutionNamespace: String!) {
                      nominatedWorkersMappings(where:{ worker: {id_eq: $workerAddress}, solution:{ id_eq: $solutionNamespace}}) {
                        id
                      }
                    }`,
                variables: {
                    workerAddress: node.ewxConfig.workerAddress,
                    solutionNamespace: node.ewxConfig.solutionNamespace
                }
            };

            axios.post(node.ewxConfig.subsquidUrl, requestPayload)
                .then((response) => {
                    const {nominatedWorkersMappings} = response.data.data;

                    if (nominatedWorkersMappings.length > 0) {
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
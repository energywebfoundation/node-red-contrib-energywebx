const {queryIsWorkerNominated} = require("../../lib/votes-graphql");
const EWXNRLogger = require("../../lib/log");

module.exports = function (RED) {
    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        node.ewxConfig = RED.nodes.getNode(config.ewxConfig);

        const logger = new EWXNRLogger('IsNominatedV2', {}, node, true);

        node.on('input', async function (msg, send, done) {
            await node.ewxConfig.ready;

            if (!msg.payload.votingRoundId) {
                logger.error(`no voting round specified`);

                send({
                    payload: {
                        isNominated: null,
                    }
                });

                return;
            }

            queryIsWorkerNominated(node, node.ewxConfig.workerAddress, msg.payload.votingRoundId, node.ewxConfig.solutionNamespace)
                .then((response) => {
                    const {votingRoundNominatedWorkersSnapshots} = response.data.data;

                    if (votingRoundNominatedWorkersSnapshots.length > 0) {
                        logger.info('worker is nominated');

                        send({
                            payload: {
                                ... msg.payload,
                                isNominated: true,
                            }
                        });
                    } else {
                        logger.warn('worker is not nominated');

                        send({
                            payload: {
                                ... msg.payload,
                                isNominated: false,
                            }
                        });
                    }
                })
                .catch((e) => {
                    logger.error('failed to check if worker is nominated');
                    logger.error(e, e.response?.data);

                    send({
                        payload: {
                            ... msg.payload,
                            isNominated: null,
                        }
                    });
                })
        });
    }

    RED.nodes.registerType("is-nominated-v2", NodeConstructor);
}
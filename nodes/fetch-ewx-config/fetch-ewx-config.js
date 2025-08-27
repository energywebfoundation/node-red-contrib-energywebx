module.exports = function (RED) {
    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        node.ewxConfig = RED.nodes.getNode(config.ewxConfig);

        node.on('input', async function (msg, send, done) {
            await node.ewxConfig.ready;

            send({
                payload: {
                    ... msg.payload,
                    workerAddress: node.ewxConfig.workerAddress,
                    solutionNamespace: node.ewxConfig.solutionNamespace,
                }
            });
        });
    }

    RED.nodes.registerType("fetch-ewx-config", NodeConstructor);
}
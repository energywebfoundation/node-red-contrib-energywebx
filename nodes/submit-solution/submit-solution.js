const EWXNRLogger = require("../../lib/log");
module.exports = function(RED) {
    const rp = require('request-promise');

    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const logger = new EWXNRLogger('SubmitSolutionResult', {}, node, true);

        node.on('input', function (msg, send, done) {

            if (!msg.payload.result || !msg.payload.votingRoundID) {
                node.error("invalid payload");
                logger.error("invalid payload");

                return;
            }
            else if (msg.payload.result.length > 64 || typeof msg.payload.result !== 'string') {
                node.error("invalid result");
                logger.error("invalid result");

                return;
            }
            else if (msg.payload.votingRoundID.length > 64 || typeof msg.payload.votingRoundID !== 'string') {
                node.error("invalid votingRoundID");
                logger.error("invalid votingRoundID");

                return;
            }

            const requestPayload = {
                noderedId: config.z,
                root: msg.payload.result,
                id: msg.payload.votingRoundID,
            };

            logger.info("submitting result", requestPayload);

            const opts = {
                method: 'POST',
                url: 'http://localhost:3002/sse/1',
                headers: {
                    'User-Agent': 'ewx-marketplace'
                },
                json: true,
                body: requestPayload,
            };

            rp(opts).then((result) => {
                logger.info("result submitted", result);

                send({
                    payload: {
                        ... requestPayload,
                        success: true,
                    }
                });

                done();
            }).catch((err) => {
                logger.error("failed to submit result");
                logger.error(err);

                send({
                    payload: {
                        ... requestPayload,
                        success: false,
                    }
                });

                done();
            });
        });

        node.on("close", function() {
            node.status({ fill: "gray", shape: "dot", text: "closing" });
        });
    };

    RED.nodes.registerType("submit-result", NodeConstructor);
}
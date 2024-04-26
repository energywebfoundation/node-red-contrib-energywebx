module.exports = function(RED) {
    const rp = require('request-promise');

    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg, send, done) {
            console.log(config);
            console.log(msg);

            if (!msg.payload.result || !msg.payload.votingRoundID) node.error("Message payload is invalid");
            else if (msg.payload.result.length > 64 || typeof msg.payload.result !== 'string') node.error("Invalid result");
            else if (msg.payload.votingRoundID.length > 32 || typeof msg.payload.votingRoundID !== 'string') node.error("Invalid votingRoundID");

            const requestPayload = {
                noderedId: config.z,
                root: msg.payload.result,
                id: msg.payload.votingRoundID,
            };

            console.log(requestPayload);

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
                console.log("result submitted:", result);
                send({
                    payload: {
                        ... requestPayload,
                        success: true,
                    }
                });

                done();
            }).catch((err) => {
                console.error("error while submitting result:", err);
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
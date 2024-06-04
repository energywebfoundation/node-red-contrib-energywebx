"use strict";
module.exports = function(RED) {
    const rp = require('request-promise');

    function SubmitResult(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.on('input', function (msg, send, done) {
            console.log(n);

            const requestPayload = {
                noderedId: n.z,
                root: msg.payload.root,
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

    RED.nodes.registerType("submit-result", SubmitResult);
}
//# sourceMappingURL=energywebx-config.js.map
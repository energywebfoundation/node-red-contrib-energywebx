module.exports = function(RED) {

    if (false) { // Test for nodes compatibilities
        throw "Info : not compatible";
    }

    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);
        this.energywebxconfig = RED.nodes.getNode(config.energywebxconfig);

        var node = this;        

        node.on('input', function(msg) {
            // var address = msg.payload;

            if (node.energywebxconfig) {
            //     node.status({ fill: "green", shape: "ring", text: "sending web3 request to " + node.chainconfig.chainName + " ..."});
                
            //     const web3 = new Web3(node.chainconfig.rpcUrl);
            //     web3.eth.getBalance(address).then( (balance) => {                    
            //         msg.payload = web3.utils.fromWei(balance, 'ether');
                            
            //         node.send(msg);
            //         node.status({ fill: "green", shape: "dot", text: "done" });                    
            //     })
            //     .catch( (error)=> {
            //         node.status({ fill: "red", shape: "dot", text: "error encountered" });
            //         node.error(error);
            //     });
                        
            } else {
                // not configured
                // node.status({ fill: "red", shape: "dot", text: "missing config" });
            }
        });

        node.on("close", function() {
            // node.status({ fill: "gray", shape: "dot", text: "closing" });
        });
    };

    RED.nodes.registerType("query-state", NodeConstructor);
}
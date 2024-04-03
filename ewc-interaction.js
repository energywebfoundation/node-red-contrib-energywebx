module.exports = function(RED) {

    if (false) { // Test for nodes compatibilities
        throw "Info : not compatible";
    }

    function NodeConstructor(config) {
        RED.nodes.createNode(this, config);
        this.energywebxconfig = RED.nodes.getNode(config.energywebxconfig);

        var node = this;        

        node.on('input', function(msg) {

            if (node.energywebxconfig) {
                        
            } else {
            
            }
        });

        node.on("close", function() {
            
        });
    };

    RED.nodes.registerType("call-ewc", NodeConstructor);
}
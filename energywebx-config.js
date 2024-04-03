module.exports = function(RED) {
    
    function EnergyWebXConfigNode(config) {

        RED.nodes.createNode(this, config);
        this.solutionNamespace = config.solutionNamespace;

        if (this.networkName === 'rex'){
            this.rpcUrl = 'https://rex-rpc.energywebx.org/';
            this.socketUrl = 'https://rex-rpc.energywebx.org/ws';
            this.explorerUrl = 'https://rex-explorer.energywebx.org/api';
        } else if (this.networkName === 'ewx') {
            this.rpcUrl = 'https://rpc.energywebx.org/';
            this.socketUrl = 'https://rpc.energywebx.org/ws';
            this.explorerUrl = 'https://explorer.energywebx.org/api';
        }
    }
    
    RED.nodes.registerType("energywebx-config", EnergyWebXConfigNode);
}
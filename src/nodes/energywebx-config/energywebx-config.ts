import {NodeInitializer} from "node-red";
import {EnergyWebConfigurationNode, EnergyWebConfigurationNodeDef, EnergyWebEnvironment} from "./modules/types";

const nodeInit: NodeInitializer = (RED): void => {
    function EnergyWebXConfigNode(this: EnergyWebConfigurationNode, config: EnergyWebConfigurationNodeDef) {
        RED.nodes.createNode(this, config);

        this.solutionNamespace = config.solutionNamespace;

        switch(config.networkName) {
            case "ewx":
                this.rpcUrl = 'https://rex-rpc.energywebx.org/';
                this.networkName = 'ewx';
                this.socketUrl = 'https://rex-rpc.energywebx.org/ws';
                this.explorerUrl = 'https://rex-explorer.energywebx.org/api';
                break;
            case 'rex':
                this.networkName = 'rex';
                this.rpcUrl = 'https://rpc.energywebx.org/';
                this.socketUrl = 'https://rpc.energywebx.org/ws';
                this.explorerUrl = 'https://explorer.energywebx.org/api';
                break;
        }

        this.on('input', (msg, send, done) => {
            RED.nodes.eachNode(r => {
                console.log(r);
            })

            send({
                payload: {
                    rpcUrl: this.rpcUrl,
                    networkName: this.networkName,
                    socketUrl: this.socketUrl,
                    solutionNamespace: this.solutionNamespace
                }
            });
            done();
        });
    }

    RED.nodes.registerType("energywebx-config", EnergyWebXConfigNode);
};

export = nodeInit;
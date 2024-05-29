import { Node, NodeDef } from "node-red";

export interface EnergyWebConfiguration {
    solutionNamespace: string;
    networkName: EnergyWebEnvironment;
    rpcUrl: string;
    socketUrl: string;
    explorerUrl: string;
}

export type EnergyWebEnvironment = 'rex' | 'ewx';

export interface EnergyWebConfigurationNodeDef extends NodeDef, EnergyWebConfiguration {
}
export type EnergyWebConfigurationNode = Node & EnergyWebConfiguration;
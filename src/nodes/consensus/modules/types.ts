import {Node, NodeDef} from "node-red";

export interface SubmitSolutionResultConfiguration {
    solutionNamespace: string;
    publicRpcUrl: string;
}

export interface SubmitSolutionResultNodeDef extends NodeDef, SubmitSolutionResultConfiguration {
}

export type SubmitSolutionResultNode = Node & SubmitSolutionResultConfiguration;
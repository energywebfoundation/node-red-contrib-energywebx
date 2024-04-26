import {EditorRED} from "node-red";
import {ConsensusNodeProperties} from "./modules/types";

declare const RED: EditorRED;

RED.nodes.registerType<ConsensusNodeProperties>("consensus-node", {
    category: "Energy Web X",
    color: "#B8FBF4",
    defaults: {},
    inputs: 1,
    outputs: 1,
    icon: "consensus.svg",
    paletteLabel: "Consensus Verification",
    label: function () {
        if (this.name) {
            return this.name;
        }

        return "Consensus Verification";
    },
});
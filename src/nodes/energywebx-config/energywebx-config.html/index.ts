import { EditorRED } from "node-red";
import {EnergyWebConfigurationNodeProperties} from "./modules/types";

declare const RED: EditorRED;

RED.nodes.registerType<EnergyWebConfigurationNodeProperties>("energywebx-config", {
    category: "Energy Web X",
    color: "#B8FBF4",
    defaults: {
        networkName: { value: 'ewx', required: true },
        solutionNamespace: { value: "oep", required: true },
        rpcUrl: { value: "" },
        socketUrl: { value: "" },
        explorerUrl: { value: "" }
    },
    inputs: 1,
    outputs: 1,
    icon: "energywebx-logo.png",
    paletteLabel: "Chain config",
    label: function () {
        if (this.name) {
            return this.name;
        }

        return "Chain config";
    },
});
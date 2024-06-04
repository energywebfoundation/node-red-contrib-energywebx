import { EditorNodeProperties } from "node-red";
import {EnergyWebConfiguration} from "../../modules/types";

export interface EnergyWebConfigurationNodeProperties
    extends EditorNodeProperties, EnergyWebConfiguration {
}
import { ScriptConfig, SettingType } from "Settings/NoteToolbarSettings";

export interface AdapterFunction {
    /** The actual function in the adapter. */
    function: Function;
    /** The name shown in the selection UI. */
    label: string;
    /** Field help text shown in the UI. */
    description: string | DocumentFragment;
    /** Parameters for the function. */
    parameters: AdapterFunctionParameter[]; 
}

export interface AdapterFunctionParameter {
    /** The parameter key in {@link ScriptConfig}. */
    parameter: keyof ScriptConfig;
    /** Label/Placeholder for the field in the UI. */
    label: string;
    /** Optional description used for help text. */
    description?: string | DocumentFragment;
    /** Field type to display. */
    type: SettingType;
    /** Is this parameter required? */
    required: boolean;
}
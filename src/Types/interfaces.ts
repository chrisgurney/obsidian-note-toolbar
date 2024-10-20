import { ScriptConfig } from "Settings/NoteToolbarSettings";

export interface Adapter {
    getFunctions(): AdapterFunction[]; // returns all functions for this adapter
    use(config: ScriptConfig): Promise<string | void>; // executes the function with provided config
}

export interface AdapterFunction {
    function: Function; // the actual function in the adapter
    label: string; // the name shown in the UI
    description: string; // field help text shown in the UI
    parameters: AdapterFunctionParameter[]; // parameters for the function
}

export interface AdapterFunctionParameter {
    parameter: keyof ScriptConfig; // the parameter key in ScriptConfig
    label: string; // label for the field in the UI
    description?: string; // optional description for UI hints
    type: 'file' | 'text'; // parameter type
    required: boolean; // is this parameter required?
}
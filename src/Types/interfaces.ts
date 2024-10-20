import { ScriptConfig } from "Settings/NoteToolbarSettings";

export interface Adapter {
    getFunctions(): AdapterFunction[]; // returns all functions for this adapter
    useFunction(config: ScriptConfig): Promise<any>; // executes the function with provided config
}

export interface AdapterFunction {
    name: string; // the name shown in the UI
    description: string; // field help text shown in the UI
    function: Function; // the actual function in the adapter
    parameters: AdapterFunctionParameter[]; // parameters for the function
}

export interface AdapterFunctionParameter {
    name: keyof ScriptConfig; // the parameter key in ScriptConfig
    type: 'string'; // parameter type
    required: boolean; // is this parameter required?
    description?: string; // optional description for UI hints
}
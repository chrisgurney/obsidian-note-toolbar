import { ScriptConfig } from "Settings/NoteToolbarSettings";

export interface Adapter {
    getFunctions(): AdapterFunction[]; // returns all functions for this adapter
    useFunction(config: ScriptConfig): Promise<any>; // executes the function with provided config
}

export interface AdapterFunction {
    functionName: string; // the actual function name in the adapter
    friendlyName: string; // the name shown in the UI
    parameters: AdapterFunctionParameter[]; // parameters for the function
}

export interface AdapterFunctionParameter {
    name: keyof ScriptConfig; // the parameter key in ScriptConfig
    type: 'string' | 'number' | 'array' | 'object'; // parameter type
    required: boolean; // is this parameter required?
    description?: string; // optional description for UI hints
}
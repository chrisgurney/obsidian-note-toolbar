import { ScriptConfig } from "Settings/NoteToolbarSettings";

export interface Adapter {
    /** Returns all functions for this adapter. */
    getFunctions(): AdapterFunction[];
    /** Executes the function with provided config. */
    use(config: ScriptConfig): Promise<string | void>; 
    /** Cleans up the adapter when it's no longer needed. */
    disable(): void; 
}

export interface AdapterFunction {
    /** The actual function in the adapter. */
    function: Function;
    /** The name shown in the selection UI. */
    label: string;
    /** Field help text shown in the UI. */
    description: string;
    /** Parameters for the function. */
    parameters: AdapterFunctionParameter[]; 
}

export interface AdapterFunctionParameter {
    /** The parameter key in {@link ScriptConfig}. */
    parameter: keyof ScriptConfig;
    /** Label/Placeholder for the field in the UI. */
    label: string;
    /** Optional description used for help text. */
    description?: string;
    /** Field type to display. */
    type: 'file' | 'text' | 'textarea';
    /** Is this parameter required? */
    required: boolean;
}
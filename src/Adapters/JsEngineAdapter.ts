import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Notice } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { Adapter, AdapterFunction } from "Types/interfaces";
import { debugLog, displayScriptError } from "Utils/Utils";

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/Internal.ts
 * @link Discord thread: https://discord.com/channels/686053708261228577/1286803892549713921
 */
export default class JsEngineAdapter implements Adapter {

    private plugin: NoteToolbarPlugin | null;
    private engineApi: any | null;
    private enginePlugin: any | null;

    private functions: AdapterFunction[] = [
        {
            function: this.exec,
            label: "Execute JavaScript",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "JavaScript file", description: "JavaScript to execute.", type: 'file', required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", type: 'text', required: false }
            ]
        },
        {
            function: this.importExec,
            label: "Import and execute JavaScript",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "JavaScript file", description: "JavaScript to execute.", type: 'file', required: true },
                { parameter: 'sourceFunction', label: "Function (optional)", description: "If script has functions, function name to execute.", type: 'text', required: false },
                { parameter: 'sourceArgs', label: "Arguments (optional)", description: "Arguments accepted by function in JSON format.", type: 'text', required: false },
            ]
        },
    ];

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.enginePlugin = (plugin.app as any).plugins.plugins["js-engine"];
        this.engineApi = this.enginePlugin.api;
    }

    getFunctions(): Map<string, AdapterFunction> {
        return new Map(this.functions.map(func => [func.function.name, func]));
    }

    async use(config: ScriptConfig): Promise<string | void> {
        let result;
        
        let containerEl;
        if (config.outputContainer) {
            containerEl = this.plugin?.getScriptOutputEl(config.outputContainer);
            if (!containerEl) {
                new Notice(`Error: Could not find note-toolbar-script callout in current note with ID: ${config.outputContainer}`, 5000);
                return;
            }
        }

        switch (config.pluginFunction) {
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, containerEl)
                    : `Error: A JavaScript file is required`;
                break;
            case 'importExec':
                result = config.sourceFile
                    ? await this.importExec(config.sourceFile, config.sourceFunction, config.sourceArgs)
                    : `Error: A JavaScript file is required`;
                break;
            case '':
                // do nothing
                break;
            default:
                result = `Unsupported function: ${config.pluginFunction}`;
                break;
        }

        return result;
    }

    disable() {
        this.engineApi = null;
        this.plugin = null;
    }

    /**
     * Wrapper for importJs(), and then executes the provided function.
     * @example
     * Script without function will only execute once?
     * console.log("👋 HelloWorld");
     * @example
     * Script with function and parameters:
     * parameters = { "name": "Chris " }
     * Script being executed:
     * export function Hello(engine, args) {
     *   console.log(`👋 Hello ${args['name']}`);
     * }
     * @param filename 
     * @param functionName 
     * @param argsJson 
     * @returns 
     */
    async importExec(filename: string, functionName?: string, argsJson?: string): Promise<string> {

        let result = '';

        let args;
        try {
            args = argsJson ? JSON.parse(argsJson) : {};
        }
        catch (error) {
            displayScriptError(`Failed to parse arguments for script: ${filename}\nError:`, error);
            return "Failed to parse arguments:\n```\n" + error + "\n```";
        }
        
        if (this.engineApi) {
            let module = await this.engineApi.importJs(filename);
            if (functionName) {
                if (module[functionName] && (typeof module[functionName] === 'function')) {
                    try {
                        if (args) {
                            result = module[functionName](this.engineApi, args);
                        }
                        else {
                            result = module[functionName](this.engineApi);
                        }
                        debugLog('importExec() result:', result);
                    }
                    catch (error) {
                        displayScriptError(`Failed to execute script: ${filename}\nError:`, error);
                    }
                }
                else {
                    displayScriptError(`Function not found: ${filename} ${functionName}`);
                }
            }
        }
        return result;

    }

    /**
     * 
     * @param filename 
     * @param containerEl 
     * @returns 
     */
    async exec(filename: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        let resultEl = containerEl || createSpan();

        const activeFile = this.plugin?.app.workspace.getActiveFile();
        if (!activeFile) {
            displayScriptError("This script must be executed from an open note.");
            return "This script must be executed from an open note.";
        }

        const component = new Component();
        component.load();
        try {
            containerEl?.empty();
            const activeFilePath = activeFile?.path;
            const execution = await this.engineApi.internal.executeFile(filename, {
                container: resultEl,
                component: this.plugin,
            });
            const renderer = this.engineApi.internal.createRenderer(resultEl, activeFilePath, this.plugin);
            debugLog('exec() result:', execution.result);
            if (this.plugin) {
                if (containerEl) {
                    renderer.render(execution.result);
                    // await MarkdownRenderer.render(this.plugin.app, execution.result, resultEl, activeFilePath, this.plugin);
                }
                else {
                    result = execution.result || '';
                }
            }
        }
        catch (error) {
            displayScriptError(`Failed to execute script: ${filename}\nError:`, error, containerEl);
        }
        finally {
            component.unload();
        }

        return result;

    }

}
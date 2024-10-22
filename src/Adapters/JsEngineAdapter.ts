import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Notice } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { Adapter, AdapterFunction } from "Types/interfaces";
import { debugLog, displayError } from "Utils/Utils";

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
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
                { parameter: 'sourceFunction', label: "Function", description: "Script function to execute.", type: 'text', required: true },
                { parameter: 'sourceArgs', label: "Arguments (optional)", description: "Arguments accepted by function in JSON format.", type: 'text', required: false },
            ]
        },
    ];

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.enginePlugin = (plugin.app as any).plugins.plugins["js-engine"];
        this.engineApi = this.enginePlugin.api;
    }

    getFunctions(): AdapterFunction[] {
        return this.functions;
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
                result = (config.sourceFile && config.sourceFunction)
                    ? await this.exec(config.sourceFile, config.sourceFunction, config.sourceArgs)
                    : `Error: A JavaScript file and function is required`;
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

    async import(script: string): Promise<void> {
        if (this.engineApi) {
            let module = await this.engineApi.importJs(script);
            debugLog("importJs", module);
        }
    }

    /**
     * @example
     * parameters = { "name": "Chris "}
     * Script being executed:
     * export function Hello(engine, args) {
     *   console.log(`👋 Hello ${args['name']}`);
     * }
     * @param filename 
     * @param functionName 
     * @param argsJson 
     * @returns 
     */
    async exec(filename: string, functionName: string, argsJson?: string): Promise<string> {

        let result = '';

        let args;
        try {
            args = argsJson ? JSON.parse(argsJson) : {};
        }
        catch (error) {
            displayError(`Failed to parse arguments for script: ${filename}\nError:`, error);
            return "Failed to parse arguments:\n```\n" + error + "\n```";
        }
        debugLog(args);
        
        if (this.engineApi) {
            let module = await this.engineApi.importJs(filename);
            debugLog("execute", module);
            if (module[functionName] && typeof module[functionName] === 'function') {
                try {
                    if (args) {
                        result = module[functionName](this.engineApi, args);
                    }
                    else {
                        result = module[functionName](this.engineApi);
                    }
                    debugLog('execute: result:', result);
                }
                catch (error) {
                    debugLog('Caught error:', error);
                }
            }
            else {
                debugLog('Function not found:', filename, functionName);
            }
        }
        return result;

    }

    // TODO? version that also accepts: functionName: string, ...args: any[]
    async execContainer(script: string, container: HTMLElement | null): Promise<void> {

        const activeFile = this.plugin?.app.workspace.getActiveFile();
        if (!activeFile) {
            debugLog("no active file");
            return;
        }

        if (!container) {
            debugLog('No container provided');
            return;
        }

        // const component = new Component();
        // component.load();
        try {
            // container?.empty();
            const activeFilePath = activeFile?.path;
            const execution = await this.engineApi.internal.executeFile(script, {
                container: container,
                component: this.plugin,
            });
            debugLog(execution.result);
            const renderer = this.engineApi.internal.createRenderer(container, activeFilePath, this.plugin);
            // renderer.render(execution.result);
            if (this.plugin) {
                await MarkdownRenderer.render(this.plugin.app, execution.result, container, activeFilePath, this.plugin);
            }
        }
        catch (error) {
            debugLog("execContainer: error:", error);
        }
        finally {
            // component.unload();
        }

    }

}
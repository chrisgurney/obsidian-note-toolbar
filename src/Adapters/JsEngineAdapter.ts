import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Notice } from "obsidian";
import { ItemType, ScriptConfig, SettingType } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { debugLog, displayScriptError } from "Utils/Utils";
import { Adapter } from "./Adapter";

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/Internal.ts
 * @link Discord thread: https://discord.com/channels/686053708261228577/1286803892549713921
 */
export default class JsEngineAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.exec,
            label: "Execute JavaScript",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "JavaScript file", description: "JavaScript to execute.", type: SettingType.File, required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", description: "Add a note-toolbar-output callout with a unique meta field to your note to put text output.", type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.importExec,
            label: "Import and execute JavaScript",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "JavaScript file", description: "JavaScript to import. Note that this file is only imported once. You may have to restart Obsidian in order to pick up changes.", type: SettingType.File, required: true },
                { parameter: 'sourceFunction', label: "Function (optional)", description: "If script has functions, function name to execute.", type: SettingType.Text, required: false },
                { parameter: 'sourceArgs', label: "Arguments (optional)", description: "Arguments accepted by function in JSON format.", type: SettingType.Text, required: false },
            ]
        },
    ];

    constructor(noteToolbar: NoteToolbarPlugin) {
        const plugin = (noteToolbar.app as any).plugins.plugins[ItemType.JsEngine];
        super(noteToolbar, plugin, plugin.api);
    }

    async use(config: ScriptConfig): Promise<string | void> {
        let result;
        
        let containerEl;
        if (config.outputContainer) {
            containerEl = this.noteToolbar?.getOutputEl(config.outputContainer);
            if (!containerEl) {
                new Notice(`Error: Could not find note-toolbar-output callout in current note with ID: ${config.outputContainer}`, 5000);
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
        
        if (this.adapterApi) {
            let module = await this.adapterApi.importJs(filename);
            if (functionName) {
                if (module[functionName] && (typeof module[functionName] === 'function')) {
                    try {
                        if (args) {
                            result = module[functionName](this.adapterApi, args);
                        }
                        else {
                            result = module[functionName](this.adapterApi);
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
     * Wraps internal.executeFile()  
     * @param filename 
     * @param containerEl 
     * @returns 
     */
    async exec(filename: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        let resultEl = containerEl || createSpan();

        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        if (!activeFile) {
            displayScriptError("This script must be executed from an open note.");
            return "This script must be executed from an open note.";
        }

        const component = new Component();
        component.load();
        try {
            containerEl?.empty();
            const activeFilePath = activeFile?.path;
            const execution = await this.adapterApi.internal.executeFile(filename, {
                container: resultEl,
                component: this.noteToolbar,
            });
            debugLog('exec() result:', execution.result);
            if (this.noteToolbar) {
                if (containerEl) {
                    const renderer = this.adapterApi.internal.createRenderer(resultEl, activeFilePath, this.noteToolbar);
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
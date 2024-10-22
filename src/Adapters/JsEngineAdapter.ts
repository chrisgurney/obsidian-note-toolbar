import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { Adapter, AdapterFunction } from "Types/interfaces";
import { debugLog } from "Utils/Utils";

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
 */
export default class JsEngineAdapter implements Adapter {

    private plugin: NoteToolbarPlugin | null;
    private engineApi: any | null;
    private enginePlugin: any | null;

    private functions: AdapterFunction[] = [
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

    async exec(script: string, functionName: string, ...args: any[]): Promise<string> {

        let result = '';
        if (this.engineApi) {
            let module = await this.engineApi.importJs(script);
            debugLog("execute", module);
            if (module[functionName] && typeof module[functionName] === 'function') {
                try {
                    if (args) {
                        result = module[functionName](this.engineApi, ...args);
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
                debugLog('Function not found:', script, functionName);
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
import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { Adapter, AdapterFunction } from "Types/interfaces";
import { debugLog } from "Utils/Utils";

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
 */
export default class JsEngineAdapter implements Adapter {

    private plugin: NoteToolbarPlugin;
    private engine: any | undefined;

    private functions: AdapterFunction[] = [
    ];

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.engine = (plugin.app as any).plugins.plugins["js-engine"].api;
    }

    getFunctions(): AdapterFunction[] {
        return this.functions;
    }

    async useFunction(config: ScriptConfig): Promise<string | undefined> {
        let result;
        
        return result;
    }

    async import(script: string): Promise<void> {
        if (this.engine) {
            let module = await this.engine.importJs(script);
            debugLog("importJs", module);
        }
    }

    async exec(script: string, functionName: string, ...args: any[]): Promise<string> {

        let result = '';
        if (this.engine) {
            let module = await this.engine.importJs(script);
            debugLog("execute", module);
            if (module[functionName] && typeof module[functionName] === 'function') {
                try {
                    if (args) {
                        result = module[functionName](this.engine, ...args);
                    }
                    else {
                        result = module[functionName](this.engine);
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

        const activeFile = this.plugin.app.workspace.getActiveFile();
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
            const execution = await this.engine.internal.executeFile(script, {
                container: container,
                component: this.plugin,
            });
            debugLog(execution.result);
            const renderer = this.engine.internal.createRenderer(container, activeFilePath, this.plugin);
            // renderer.render(execution.result);
            await MarkdownRenderer.render(this.plugin.app, execution.result, container, activeFilePath, this.plugin);
        }
        catch (error) {
            debugLog("execContainer: error:", error);
        }
        finally {
            // component.unload();
        }

    }

}
import NoteToolbarPlugin from "main";
import { Component } from "obsidian";
import { debugLog } from "Utils/Utils";

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
 */
export default class JsEngineAdapter {

    plugin: NoteToolbarPlugin;
    engine: any | undefined;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.engine = (plugin.app as any).plugins.plugins["js-engine"].api;
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

}
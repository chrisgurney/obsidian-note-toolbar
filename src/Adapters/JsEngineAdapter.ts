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

    async importJs(script: string, functionName?: string, ...args: any[]) {

        if (this.engine) {
            let module = await this.engine.importJs(script);
            debugLog("importJs", module);
            if (functionName) {
                if (module[functionName] && typeof module[functionName] === 'function') {
                    if (args) {
                        module[functionName](...args);
                    }
                    else {
                        module[functionName]();
                    }
                }
                else {
                    debugLog('Function not found:', script, functionName);
                }
            }
        }

    }

}
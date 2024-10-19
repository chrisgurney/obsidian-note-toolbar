import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { debugLog } from "Utils/Utils";

/**
 * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts
 */
export default class DataviewAdapter {

    plugin: NoteToolbarPlugin;
    dataviewPlugin: any | undefined;
    dataviewApi: any | undefined;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.dataviewPlugin = (plugin.app as any).plugins.plugins["dataview"];
        this.dataviewApi = (plugin.app as any).plugins.plugins["dataview"].api;
    }

    async use(config: ScriptConfig): Promise<string | undefined> {
        
        let containerEl;
        if (config.outputContainer) {
            containerEl = this.plugin.getScriptOutputEl(config.outputContainer);
            if (!containerEl) {
                debugLog('Could not find container:', config.outputContainer);
                return;
            }
        }

        let result;
        switch (config.pluginFunction) {
            case 'evaluate':
                result = await this.evaluate(config.expression);
                break;
            case 'evaluateInline':
                result = await this.evaluateInline(config.expression);
                break;
            case 'executeJs':
                await this.executeJs(config.expression, containerEl);
                break;
            case 'query':
                result = await this.query(config.expression, containerEl);
                break;
            case 'exec':
                await this.exec(config.sourceFile, config.sourceArgs, containerEl);
                break;
            default:
                debugLog('Unsupported function');
                break;
        }
        return result;

    }

    // TODO: is there a need for both of these functions? with evaluateInline? (would require an active file)
    async evaluate(expression?: string): Promise<string> {

        let result = '';

        if (!expression) {
            return '';
        }

        const activeFile = this.plugin.app.workspace.getActiveFile();    
        try {
            if (this.dataviewApi) {
                debugLog("evaluate: " + expression);
                // Result<Literal, string>
                let dvResult = await (this.dataviewApi as any).evaluate(expression, activeFile);
                debugLog("evaluate: result: ", dvResult.value);
                result = dvResult.value;
            }
        }
        catch (error) {
            debugLog("Caught error:", error);
        }

        return result;

    }

    async evaluateInline(expression?: string): Promise<string> {

        let result = '';
        
        if (!expression) {
            return '';
        }

        const activeFile = this.plugin.app.workspace.getActiveFile();
        try {
            if (this.dataviewApi) {
                debugLog("evaluate: " + expression);
                // Result<Literal, string>
                let dvResult = await (this.dataviewApi as any).evaluateInline(expression, activeFile?.path);
                debugLog("evaluate: result:", dvResult);
                result = dvResult.value instanceof Object ? dvResult.value.constructor.name : dvResult.value.toString();
                // TODO? render into provided container?
                // await this.dataviewApi.enderValue(
                //     value: any,
                //     container: HTMLElement,
                //     component: Component,
                //     filePath: string,
                //     inline: boolean = false
                // )
            }
        }
        catch (error) {
            debugLog("Caught error:", error);
        }

        return result;

    }

    async executeJs(expression?: string, container?: HTMLElement): Promise<void> {

        let resultEl: HTMLElement = container ? container : document.createElement('div');

        if (!expression) {
            return;
        }
        
        const activeFile = this.plugin.app.workspace.getActiveFile();

        const component = new Component();
        component.load();
        try {
            if (this.dataviewApi) {
                debugLog("executeJs: ", expression);
                // e.g., add a code block, get the element, then pass it
                await (this.dataviewApi as any).executeJs(expression, resultEl, component, activeFile?.path);
                debugLog("executeJs: result: ", resultEl);
            }
        }
        catch (error) {
            debugLog("Caught error:", error);
        }
        finally {
            component.unload();
        }

    }

    /**
     * Adaptation of dv.view(). This version does not support CSS.
     * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/inline-api.ts
     */
    async exec(script?: string, input: any = null, container?: HTMLElement) {

        if (!script) {
            return;
        }

        const activeFile = this.plugin.app.workspace.getActiveFile();

        // TODO: this works if the script doesn't need a container... but where does this span go?
        container = container ? container : createSpan();

        if (!activeFile) {
            debugLog("view: We're not in a file");
            return;
        }
        if (!container) {
            debugLog("view: no output component found");
            return;
        }
        
        const currentFilePath = activeFile.path;

        let viewFile = this.plugin.app.metadataCache.getFirstLinkpathDest(script, currentFilePath);

        if (!viewFile) {
            // TODO: render messages into the container
            // debugLog(container, `view: custom view not found for '${simpleViewPath}' or '${complexViewPath}'.`);
            debugLog(`view: script file not found: ${script}`);
            return;
        }

        let contents = await this.plugin.app.vault.read(viewFile);
        if (contents.contains("await")) contents = "(async () => { " + contents + " })()";
        contents += `\n//# sourceURL=${viewFile.path}`;
        let func = new Function("dv", "input", contents);

         // FIXME? component is too short-lived; using this.plugin instead, but might lead to memory leaks? thread:
         // https://discord.com/channels/686053708261228577/840286264964022302/1296883427097710674
         // "then you need to hold on to your component longer and call unload when you want to get rid of the element"
		const component = new Component();
		component.load();
        try {
            container.empty();
            let dataviewLocalApi = this.dataviewPlugin.localApi(activeFile.path, this.plugin, container);    
            // from dv.view: may directly render, in which case it will likely return undefined or null
            let result = await Promise.resolve(func(dataviewLocalApi, input));
            if (result) {
                await this.dataviewApi.renderValue(
                    this.plugin.app,
                    result as any,
                    container,
                    currentFilePath,
                    this.plugin,
                    this.dataviewApi.settings, // this.settings
                    true
                );
            }
        }
        catch (error) {
            // TODO: render messages into container, if provided
            // debugLog(container, `view: Failed to execute '${viewFile.path}'.\n\n${ex}`);
            debugLog(`view: Failed to execute '${viewFile.path}'.\n\n${error}`);
        }
        finally {
			component.unload();
		}

    }

    async query(expression?: string, container?: HTMLElement): Promise<string> {

        let result = '';
        const activeFile = this.plugin.app.workspace.getActiveFile();

        if (!expression) {
            return '';
        }
        if (!activeFile) {
            debugLog("view: We're not in a file");
            return '';
        }

        const component = new Component();
        component.load();
        try {
            if (this.dataviewApi) {
                debugLog("query: " + expression);
                // returns a Promise<Result<QueryResult, string>>
                let dvResult = await (this.dataviewApi as any).queryMarkdown(expression, activeFile, this.dataviewApi.settings);
                // TODO: is there a chance result is empty/undefined?
                debugLog("query: result: ", dvResult);
                if (container) {
                    container.empty();
                    MarkdownRenderer.render(
                        this.plugin.app,
                        dvResult.successful ? dvResult.value : dvResult.error,
                        container,
                        activeFile.path,
                        component
                    );
                }
                result = dvResult.successful ? dvResult.value : '```' + dvResult.error + '```';
            }
        }
        catch (error) {
            console.error("obsidian-dataview:", error);
        }
        finally {
			component.unload();
		}

        return result;

    }

}
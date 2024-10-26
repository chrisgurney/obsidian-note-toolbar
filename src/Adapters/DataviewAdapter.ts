import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Notice } from "obsidian";
import { ItemType, ScriptConfig, SettingType } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { debugLog, displayScriptError } from "Utils/Utils";
import { Adapter } from "./Adapter";

/**
 * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts
 */
export default class DataviewAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.query,
            label: "Execute query",
            description: "",
            parameters: [
                { parameter: 'expression', label: "Query", description: "Dataview query to evaluate.", type: SettingType.TextArea, required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", description: "Add a note-toolbar-output callout with a unique meta field to your note to put text output.", type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.exec,
            label: "Execute JavaScript",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "JavaScript file", description: "Dataview JS file to execute.", type: SettingType.File, required: true },
                { parameter: 'sourceArgs', label: "Arguments (optional)", description: "Parameters for your script in JSON format.", type: SettingType.Text, required: false },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", description: "Add a note-toolbar-output callout with a unique meta field to your note to put text output.", type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.evaluate,
            label: "Evaluate Dataview expression",
            description: "",
            parameters: [
                { parameter: 'expression', label: "Dataview expression", description: "Dataview expression to evaluate.", type: SettingType.Text, required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", description: "Add a note-toolbar-output callout with a unique meta field to your note to put text output.", type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.executeJs,
            label: "Evaluate Dataview JS expression",
            description: "",
            parameters: [
                { parameter: 'expression', label: "Dataview JS expression",  description: "Dataview JS expression to evaluate.", type: SettingType.Text, required: true },
                { parameter: 'outputContainer', label: "Output callout ID (optional)", description: "Add a note-toolbar-output callout with a unique meta field to your note to put text output.", type: SettingType.Text, required: false }
            ]
        },
    ];

    constructor(noteToolbar: NoteToolbarPlugin) {
        const plugin = (noteToolbar.app as any).plugins.plugins[ItemType.Dataview];
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
            case 'evaluate':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl)
                    : `Error: A Dataview expression is required`;
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, config.sourceArgs, containerEl)
                    : `Error: A script file is required`;
                break;
            case 'executeJs':
                result = config.expression
                    ? await this.executeJs(config.expression, containerEl)
                    : `Error: A Dataview JS expression is required`;
                break;
            case 'query':
                result = config.expression
                    ? await this.query(config.expression, containerEl)
                    : `Error: A Dataview query is required`;
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
     * Wrapper of evaluateInline().
     * @example
     * 2 + 6
     * @example
	 * date(today)
     * @example
	 * dateformat(this.file.mtime, "yyyy.MM.dd - HH:mm")
     * @param expression 
     * @param containerEl 
     * @returns 
     */
    private async evaluate(expression: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        
        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path;

        const component = new Component();
		component.load();
        try {
            if (this.adapterApi) {
                debugLog("evaluate() " + expression);
                let dvResult = await (this.adapterApi as any).evaluateInline(expression, activeFile?.path);
                debugLog("evaluate() result:", dvResult);
                if (containerEl) {
                    containerEl.empty();
                    await this.adapterApi.renderValue(
                        dvResult.value,
                        containerEl,
                        component,
                        activeFilePath
                    );
                }
                else {
                    result = dvResult.successful ? dvResult.value : '```\n' + dvResult.error + '\n```';
                }
            }
        }
        catch (error) {
            displayScriptError(`Failed to evaluate expression: ${expression}\nDataview error:`, error, containerEl);
            result = "Dataview error: Check console for more details.\n```\n" + error + "\n```";
        }
        finally {
            component.unload();
        }

        return result;

    }

    /**
     * Adaptation of dv.view(). This version does not support CSS.
     * @example
     * Scripts/HelloWorld.js // script has no function
     * Arguments = { "fileFolder": "Demos" }
     * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/inline-api.ts
     */
    private async exec(filename: string, argsJson?: string, containerEl?: HTMLElement) {

        if (!filename) {
            return;
        }

        let args;
        try {
            args = argsJson ? JSON.parse(argsJson) : {};
        }
        catch (error) {
            displayScriptError(`Failed to parse arguments for script: ${filename}\nError:`, error, containerEl);
            return;
        }
        
        // TODO: this works if the script doesn't need a container... but where does this span go?
        containerEl = containerEl || createSpan();

        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        if (!activeFile) {
            displayScriptError("This script must be executed from an open note.");
            return;
        }
        const activeFilePath = activeFile.path;

        let viewFile = this.noteToolbar?.app.metadataCache.getFirstLinkpathDest(filename, activeFilePath);
        if (!viewFile) {
            // TODO: render messages into the container, if provided
            displayScriptError(`Script file not found: ${filename}`);
            return;
        }

        let contents = await this.noteToolbar?.app.vault.read(viewFile);
        if (contents) {
            if (contents.contains("await")) contents = "(async () => { " + contents + " })()";
            contents += `\n//# sourceURL=${viewFile.path}`;
            let func = new Function("dv", "input", contents);
         // FIXME? component is too short-lived; using this.plugin instead, but might lead to memory leaks? thread:
         // https://discord.com/channels/686053708261228577/840286264964022302/1296883427097710674
         // "then you need to hold on to your component longer and call unload when you want to get rid of the element"
         const component = new Component();
         component.load();
         try {
             containerEl.empty();
             let dataviewLocalApi = this.adapterPlugin.localApi(activeFile.path, this.noteToolbar, containerEl);    
             // from dv.view: may directly render, in which case it will likely return undefined or null
             // TODO: try: args should be provided as a string that's read in as JSON; note other script types need to support this as well
             let result = await Promise.resolve(func(dataviewLocalApi, args));
             if (result && this.noteToolbar) {
                 await this.adapterApi.renderValue(
                     this.noteToolbar.app,
                     result as any,
                     containerEl,
                     activeFilePath,
                     component,
                     this.adapterApi.settings,
                     true
                 );
             }
         }
         catch (error) {
             displayScriptError(`Failed to execute script: ${viewFile.path}\nError:`, error, containerEl);
         }
         finally {
             component.unload();
         }

        }

    }

    /**
     * @example
     * dv.el('p', dv.current().file.mtime)
     * @example
	 * console.log(dv.current().file.mtime)
     * @param expression 
     * @param containerEl 
     * @returns 
     */
    private async executeJs(expression: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        let resultEl = containerEl || createSpan();

        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();

        const component = new Component();
        component.load();
        try {
            if (this.adapterApi) {
                debugLog("executeJs() ", expression);
                await (this.adapterApi as any).executeJs(expression, resultEl, component, activeFile?.path);
                debugLog("executeJs() result:", resultEl);
                if (!containerEl) {
                    const errorEl = resultEl.querySelector('.dataview-error');
                    if (errorEl) {
                        throw new Error(errorEl.textContent ?? undefined);
                    }
                    else if (resultEl.children.length === 0 && resultEl.textContent?.trim() === '') {
                        // nothing was returned; do nothing? may depend on what user wants to do
                        debugLog('executeJs() no result');
                        result = '';
                    }
                    else {
                        result = resultEl.textContent || '';
                    }
                }
            }
        }
        catch (error) {
            displayScriptError(`Failed to evaluate expression: ${expression}\nDataview error:`, error, containerEl);
        }
        finally {
            component.unload();
        }

        return result;

    }

    /**
     * Runs the given Dataview query, returning the output from the Dataview API: queryMarkdown
     * If a container is provided, it renders the resulting markdown to the given container.
     * @example
     * TABLE file.mtime AS "Last Modified" FROM "Demos" SORT file.mtime DESC
     * @param expression 
     * @param containerEl 
     * @returns 
     */
    private async query(expression: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();

        if (!activeFile) {
            displayScriptError("This query must be run from an open note.");
            return "This query must be run from an open note.";
        }

        const component = new Component();
        component.load();
        try {
            if (this.adapterApi) {
                debugLog("query() " + expression);
                // returns a Promise<Result<QueryResult, string>>
                let dvResult = await (this.adapterApi as any).queryMarkdown(expression, activeFile, this.adapterApi.settings);
                debugLog("query() result: ", dvResult);
                if (containerEl) {
                    containerEl.empty();
                    if (this.noteToolbar) {
                        MarkdownRenderer.render(
                            this.noteToolbar.app,
                            dvResult.successful ? dvResult.value : dvResult.error,
                            containerEl,
                            activeFile.path,
                            component
                        );
                    }
                }
                else {
                    result = dvResult.successful ? dvResult.value : '```\n' + dvResult.error + '\n```';
                }
            }
        }
        catch (error) {
            displayScriptError(`Failed to evaluate query: ${expression}\nDataview error:`, error, containerEl);
            result = "Dataview error: Check console for more details.\n```\n" + error + "\n```";
        }
        finally {
			component.unload();
		}

        return result;

    }

}
import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer } from "obsidian";
import { ErrorBehavior, ItemType, ScriptConfig, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { importArgs } from "Utils/Utils";
import { Adapter } from "./Adapter";

/**
 * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts
 */
export default class DataviewAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.query,
            label: t('adapter.dataview.query-function'),
            description: "",
            parameters: [
                { parameter: 'expression', label: t('adapter.dataview.query-expr'), description: t('adapter.dataview.query-expr-description'), type: SettingType.TextArea, required: true },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.exec,
            label: t('adapter.dataview.exec-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.dataview.exec-sourcefile'), description: t('adapter.dataview.exec-sourcefile-description'), type: SettingType.File, required: true },
                { parameter: 'sourceArgs', label: t('adapter.args'), description: t('adapter.args-description'), type: SettingType.Args, required: false },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.evaluate,
            label: t('adapter.dataview.eval-function'),
            description: "",
            parameters: [
                { parameter: 'expression', label: t('adapter.dataview.eval-expr'), description: t('adapter.dataview.eval-expr-description'), type: SettingType.TextArea, required: true },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.executeJs,
            label: t('adapter.dataview.dvjs-function'),
            description: "",
            parameters: [
                { parameter: 'expression', label: t('adapter.dataview.dvjs-expr'),  description: t('adapter.dataview.dvjs-expr-description'), type: SettingType.TextArea, required: true },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
    ];

    constructor(noteToolbar: NoteToolbarPlugin) {
        const plugin = (noteToolbar.app as any).plugins.plugins[ItemType.Dataview];
        super(noteToolbar, plugin, plugin.api);
    }

    /**
     * @see Adapter.use
     */
    async use(config: ScriptConfig): Promise<string | void> {
        
        let result;

        let containerEl;
        if (config.outputContainer) {
            containerEl = this.ntb?.el.getOutputEl(config.outputContainer);
            if (!containerEl) {
                this.displayScriptError(t('adapter.error.callout-not-found', { id: config.outputContainer }));
                return;
            }
        }

        switch (config.pluginFunction) {
            case 'evaluate':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl)
                    : t('adapter.dataview.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'evaluateInline':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl, ErrorBehavior.Report)
                    : t('adapter.dataview.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'evaluateIgnore':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl, ErrorBehavior.Ignore)
                    : t('adapter.dataview.eval-expr-error-required');
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, config.sourceArgs, containerEl)
                    : t('adapter.dataview.exec-error-required');
                break;
            case 'executeJs':
                result = config.expression
                    ? await this.executeJs(config.expression, containerEl)
                    : t('adapter.dataview.dvjs-expr-error-required');
                break;
            case 'query':
                result = config.expression
                    ? await this.query(config.expression, containerEl)
                    : t('adapter.dataview.query-expr-error-required');
                break;
            case '':
                // do nothing
                break;
            default:
                result = t('adapter.error.function-invalid', { function: config.pluginFunction });
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
     * @param errorBehavior
     * @returns 
     */
    private async evaluate(
        expression: string, 
        containerEl?: HTMLElement, 
        errorBehavior: ErrorBehavior = ErrorBehavior.Display
    ): Promise<string> {

        let result = '';
        
        const activeFile = this.ntb?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path;

        const component = new Component();
		component.load();
        try {
            if (this.adapterApi) {
                // this.noteToolbar?.debug("evaluate() " + expression);
                let dvResult = await (this.adapterApi as any).evaluateInline(expression, activeFile?.path);
                // this.noteToolbar?.debug("evaluate() result:", dvResult);
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
                    if (dvResult.error) throw dvResult.error;
                    result = dvResult.value;
                }
            }
        }
        catch (error) {
            switch (errorBehavior) {
                case ErrorBehavior.Display:
                    this.displayScriptError(t('adapter.error.expr-failed', { expression: expression }), error, containerEl);
                    result = t('adapter.error.general', { error: error });
                    break;
                case ErrorBehavior.Report:
                    result = expression;
                    console.error(t('adapter.error.expr-failed', { expression: expression }) + " • ", error);
                    break;
                case ErrorBehavior.Ignore:
                    // do nothing
                    break;
            }
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
            args = argsJson ? importArgs(argsJson) : {};
        }
        catch (error) {
            this.displayScriptError(t('adapter.error.args-parsing', { filename: filename }), error, containerEl);
            return;
        }
        
        // TODO: this works if the script doesn't need a container... but where does this span go?
        containerEl = containerEl || createSpan();

        const activeFile = this.ntb?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path || '';

        let viewFile = this.ntb?.app.metadataCache.getFirstLinkpathDest(filename, activeFilePath);
        if (!viewFile) {
            // TODO: render messages into the container, if provided
            this.displayScriptError(t('adapter.error.file-not-found', { filename: filename }));
            return;
        }

        let contents = await this.ntb?.app.vault.read(viewFile);
        if (contents) {
            if (contents.includes("await")) contents = "(async () => { " + contents + " })()";
            contents += `\n//# sourceURL=${viewFile.path}`;
            let func = new Function("dv", "input", contents);
         // FIXME? component is too short-lived; using this.plugin instead, but might lead to memory leaks? thread:
         // https://discord.com/channels/686053708261228577/840286264964022302/1296883427097710674
         // "then you need to hold on to your component longer and call unload when you want to get rid of the element"
         const component = new Component();
         component.load();
         try {
             containerEl.empty();
             let dataviewLocalApi = this.adapterPlugin.localApi(activeFilePath, this.ntb, containerEl);    
             // from dv.view: may directly render, in which case it will likely return undefined or null
             let result = await Promise.resolve(func(dataviewLocalApi, args));
             if (result && this.ntb) {
                 await this.adapterApi.renderValue(
                     this.ntb.app,
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
             this.displayScriptError(t('adapter.error.exec-failed', { filename: viewFile.path }), error, containerEl);
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

        const activeFile = this.ntb?.app.workspace.getActiveFile();

        const component = new Component();
        component.load();
        try {
            if (this.adapterApi) {
                // this.noteToolbar?.debug("executeJs() ", expression);
                await (this.adapterApi as any).executeJs(expression, resultEl, component, activeFile?.path);
                // this.noteToolbar?.debug("executeJs() result:", resultEl);
                if (!containerEl) {
                    const errorEl = resultEl.querySelector('.dataview-error');
                    if (errorEl) {
                        throw new Error(errorEl.textContent ?? undefined);
                    }
                    else if (resultEl.children.length === 0 && resultEl.textContent?.trim() === '') {
                        // nothing was returned; do nothing? may depend on what user wants to do
                        // this.noteToolbar?.debug('executeJs() no result');
                        result = '';
                    }
                    else {
                        result = resultEl.textContent || '';
                    }
                }
            }
        }
        catch (error) {
            this.displayScriptError(t('adapter.error.expr-failed', { expression: expression }), error, containerEl);
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
        const activeFile = this.ntb?.app.workspace.getActiveFile();

        if (!activeFile) {
            this.displayScriptError(t('adapter.error.query-note-not-open'));
            return t('adapter.error.query-note-not-open');
        }

        const component = new Component();
        component.load();
        try {
            if (this.adapterApi) {
                this.ntb?.debug("query() " + expression);
                // returns a Promise<Result<QueryResult, string>>
                let dvResult = await (this.adapterApi as any).queryMarkdown(expression, activeFile, this.adapterApi.settings);
                this.ntb?.debug("query() result: ", dvResult);
                if (containerEl) {
                    containerEl.empty();
                    if (this.ntb) {
                        MarkdownRenderer.render(
                            this.ntb.app,
                            dvResult.successful ? dvResult.value : dvResult.error,
                            containerEl,
                            activeFile.path,
                            component
                        );
                    }
                }
                else {
                    if (dvResult.error) throw dvResult.error;
                    result = dvResult.value;
                }
            }
        }
        catch (error) {
            this.displayScriptError(t('adapter.error.query-failed', { expression: expression }), error, containerEl);
            result = t('adapter.error.general', { error: error });
        }
        finally {
			component.unload();
		}

        return result;

    }

}
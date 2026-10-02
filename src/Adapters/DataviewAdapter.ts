import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Plugin } from "obsidian";
import { ItemType, ScriptConfig, ScriptContext, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { Adapter } from "./Adapter";

type DataviewResult = {
    error: Error;
    successful: boolean;
    value: string;
};

type DataviewQuerySettings = {
    forceId?: boolean;
};

/**
 * @link https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/api/plugin-api.ts
 */
export default class DataviewAdapter extends Adapter {

    get FUNCTIONS(): AdapterFunction[] {
        return [
            {
                name: 'query',
                function: this.query as (...args: unknown[]) => Promise<string>,
                label: t('adapter.dataview.query-function'),
                description: "",
                parameters: [
                    { parameter: 'expression', label: t('adapter.dataview.query-expr'), description: t('adapter.dataview.query-expr-description'), type: SettingType.TextArea, required: true },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
                ]
            },
            {
                name: 'exec',
                function: this.exec as (...args: unknown[]) => Promise<string>,
                label: t('adapter.dataview.exec-function'),
                description: "",
                parameters: [
                    { parameter: 'sourceFile', label: t('adapter.dataview.exec-sourcefile'), description: t('adapter.dataview.exec-sourcefile-description'), type: SettingType.File, required: true },
                    { parameter: 'sourceArgs', label: t('adapter.args'), description: t('adapter.args-description'), type: SettingType.Args, required: false },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
                ]
            },
            {
                name: 'evaluate',
                function: this.evaluate as (...args: unknown[]) => Promise<string>,
                label: t('adapter.dataview.eval-function'),
                description: "",
                parameters: [
                    { parameter: 'expression', label: t('adapter.dataview.eval-expr'), description: t('adapter.dataview.eval-expr-description'), type: SettingType.TextArea, required: true },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
                ]
            },
            {
                name: 'executeJs',
                function: this.executeJs as (...args: unknown[]) => Promise<string>,
                label: t('adapter.dataview.dvjs-function'),
                description: "",
                parameters: [
                    { parameter: 'expression', label: t('adapter.dataview.dvjs-expr'),  description: t('adapter.dataview.dvjs-expr-description'), type: SettingType.TextArea, required: true },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
                ]
            },
        ];
    }

    private adapterApi: {
        evaluateInline: (expression: string, origin: string) => Promise<DataviewResult>;
        executeJs: (expression: string, resultEl: HTMLElement, component: Component, filePath: string) => Promise<string>;
        renderValue: (value: unknown, container: HTMLElement, component: Component, filePath: string) => Promise<string>;
        queryMarkdown: (expression: string, originFile?: string, settings?: DataviewQuerySettings) => Promise<DataviewResult>;
    } | null;
    private adapterPlugin: { 
        api: unknown;
        localApi: (path: string, component: Component, el: HTMLElement) => unknown;
        settings: Record<string, string>;
    } & Plugin | null;

    constructor(ntb: NoteToolbarPlugin) {
        const plugin = ntb.app.plugins.plugins[ItemType.Dataview] as { api: unknown, settings: unknown } & Plugin;
        super(ntb);
        this.adapterPlugin = plugin as typeof this.adapterPlugin;
        this.adapterApi = this.adapterPlugin?.api as typeof this.adapterApi;
    }

    disable() {
        this.adapterApi = null;
        this.adapterPlugin = null;;
    }
    
    getSetting(settingName: string): string {
        return this.adapterPlugin ? this.adapterPlugin.settings[settingName] : '';
    }

    /**
     * @see {@link Adapter.use}
     */
    async use(config: ScriptConfig, errorContext: ScriptContext): Promise<string | void> {

        let result;

        const containerEl = this.ntb.adapters.utils.checkContainer(config.outputContainer, errorContext);

        switch (config.pluginFunction) {
            case 'evaluate':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.dataview.eval-expr-error-required'), errorContext);
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'evaluateInline':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.dataview.eval-expr-error-required'), errorContext);
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'evaluateIgnore':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.dataview.eval-expr-error-required'), errorContext);
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, errorContext, config.sourceArgs, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.dataview.exec-error-required'), errorContext);
                break;
            case 'executeJs':
                result = config.expression
                    ? await this.executeJs(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.dataview.dvjs-expr-error-required'), errorContext);
                break;
            case 'query':
                result = config.expression
                    ? await this.query(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.dataview.query-expr-error-required'), errorContext);
                break;
            default:
                this.ntb.adapters.utils.displayError(t('adapter.error.function-invalid', { function: config.pluginFunction }), errorContext);
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
    private evaluate = async (
        expression: string, 
        errorContext: ScriptContext,
        containerEl?: HTMLElement
    ): Promise<string> => {

        let result = '';
        
        const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path || '';

        const component = new Component();
		component.load();
        try {
            if (this.adapterApi && activeFilePath) {
                // this.noteToolbar?.debug("evaluate() " + expression);
                const dvResult: DataviewResult = await this.adapterApi.evaluateInline(expression, activeFilePath);
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
            result = this.ntb.adapters.utils.handleError(error, errorContext, expression, containerEl) ?? result;
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
    private exec = async (
        filename: string,
        errorContext: ScriptContext,
        argsJson?: string,
        containerEl?: HTMLElement,
    ): Promise<string | undefined> => {

        let result;

        if (!filename) return;

        const scriptFile = this.ntb.adapters.utils.checkFile(filename, errorContext);
        const scriptFilePath = scriptFile?.path || filename;
        errorContext['scriptFile'] = scriptFilePath;

        if (!scriptFile) {
            this.ntb.adapters.utils.displayError(t('adapter.error.file-not-found', { filename: filename }), errorContext);
            return;
        }

        let contents = await this.ntb.app.vault.cachedRead(scriptFile);
        if (!contents.trim()) {
            this.ntb.adapters.utils.displayError(t('adapter.error.file-empty', { filename: filename }), errorContext);
            return;
        }

        const args = this.ntb.adapters.utils.checkArgs(argsJson, errorContext, containerEl);
        if (!args) return '';
        // const importedArgs = argsJson ? importArgs(argsJson) : { value: {} };
        // if (importedArgs.value === null) {
        //     displayScriptError(importedArgs.error, t('adapter.error.args-parsing', { filename }), containerEl);
        //     return;
        // }
        // const args = importedArgs.value;
        
        // TODO: this works if the script doesn't need a container... but where does this span go?
        containerEl = containerEl || createSpan();

        const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path || '';

        // if (contents.includes("await")) contents = "(async () => { " + contents + " })()";
        contents += `\n//# sourceURL=${scriptFile.path}`;
        // FIXME? component is too short-lived; using this.plugin instead, but might lead to memory leaks? thread:
        // https://discord.com/channels/686053708261228577/840286264964022302/1296883427097710674
        // "then you need to hold on to your component longer and call unload when you want to get rid of the element"
        const component = new Component();
        component.load();
        try {
            const func = new DataviewAdapter.AsyncFunction("dv", "input", contents);
            containerEl.empty();
            const dataviewLocalApi = this.adapterPlugin?.localApi(activeFilePath, component, containerEl);    
            // from dv.view: may directly render, in which case it will likely return undefined or null
            result = await Promise.resolve((func as (...args: unknown[]) => unknown)(dataviewLocalApi, args));
            // console.debug(result, containerEl);
            if (result && component) {
                    await this.adapterApi?.renderValue(
                        result,
                        containerEl,
                        component,
                        activeFilePath
                    );
            }
        }
        catch (error) {
            result = this.ntb.adapters.utils.handleError(error, errorContext, contents, containerEl) ?? result;
        }
        finally {
            containerEl.addEventListener('remove', () => component.unload(), { once: true });
        }

        return result as string;

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
    executeJs = async (
        expression: string,
        errorContext: ScriptContext,
        containerEl?: HTMLElement
    ): Promise<string> => {

        let result = '';
        const resultEl = containerEl || createSpan();

        const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path || '';

        const component = new Component();
        component.load();
        try {
            if (this.adapterApi) {
                // console.debug("executeJs() ", expression);
                await this.adapterApi?.executeJs(expression, resultEl, component, activeFilePath);
                // console.debug("executeJs() result:", resultEl);
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
            result = this.ntb.adapters.utils.handleError(error, errorContext, expression, containerEl) ?? result;
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
    private query = async (
        expression: string,
        errorContext: ScriptContext,
        containerEl?: HTMLElement
    ): Promise<string> => {

        let result = '';

        const activeFile = this.ntb.adapters.utils.checkActiveFile(errorContext.errorBehavior);
        if (!activeFile) return t('adapter.error.query-note-not-open');;

        const component = new Component();
        component.load();
        try {
            if (this.adapterApi) {
                this.ntb.debug('Note Toolbar: Evaluating:\n', this.ntb.adapters.utils.formatExpression(expression));
                // returns a Promise<Result<QueryResult, string>>
                const dvResult = await this.adapterApi.queryMarkdown(expression, activeFile.path);
                this.ntb.debug("Note Toolbar: Query result:\n", dvResult);
                if (containerEl) {
                    containerEl.empty();
                    if (this.ntb) {
                        await MarkdownRenderer.render(
                            this.ntb.app,
                            dvResult.successful ? dvResult.value : String(dvResult.error),
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
            result = this.ntb.adapters.utils.handleError(error, errorContext, expression, containerEl) ?? result;
        }
        finally {
			component.unload();
		}

        return result;

    }

}
import NoteToolbarPlugin from "main";
import { Component, Plugin, TFile } from "obsidian";
import { ErrorBehavior, ItemType, ScriptConfig, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { importArgs } from "Utils/Utils";
import { Adapter } from "./Adapter";
import { learnMoreFr } from "Settings/UI/Utils/SettingsUIUtils";

type JsEngineResult = {
    functionBuildError?: Error;
    functionRunError?: Error;
    result: {
        apiInstance: unknown;
        content?: string;
        markdownElements?: [];
    };
}

type JsExecution = {
    functionBuildError?: Error;
    functionRunError?: Error;
    result: unknown;
}

type ResultRenderer = {
    render(value: unknown): Promise<void>;
}

type EngineExecutionParams = {
	code: string;
	component: Component;
	container?: HTMLElement | undefined;
	context: ExecutionContext;
}

type ExecutionContext = {
    executionSource: 'markdown-other';
    file?: TFile;
}

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/Internal.ts
 * @link Discord thread: https://discord.com/channels/686053708261228577/1286803892549713921
 */
export default class JsEngineAdapter extends Adapter {

    get FUNCTIONS(): AdapterFunction[] {
        return [
            {
                name: 'evaluate',
                function: this.evaluate as (...args: unknown[]) => Promise<string>,
                label: t('adapter.js-engine.eval-function'),
                description: "",
                parameters: [
                    { parameter: 'expression', label: t('adapter.js-engine.eval-expr'), description: t('adapter.js-engine.eval-expr-description'), type: SettingType.TextArea, required: true },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
                ]
            },
            {
                name: 'exec',
                function: this.exec as (...args: unknown[]) => Promise<string>,
                label: t('adapter.js-engine.exec-function'),
                description: "",
                parameters: [
                    { parameter: 'sourceFile', label: t('adapter.js-engine.exec-sourcefile'), description: t('adapter.js-engine.exec-sourcefile-description'), type: SettingType.File, required: true },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: learnMoreFr(t('adapter.outputcontainer-description'), '/Executing-scripts#output-callout'), type: SettingType.Text, required: false }
                ]
            },
            {
                name: 'importExec',
                function: this.importExec as (...args: unknown[]) => Promise<string>,
                label: t('adapter.js-engine.importexec-function'),
                description: "",
                parameters: [
                    { parameter: 'sourceFile', label: t('adapter.js-engine.importexec-sourcefile'), description: t('adapter.js-engine.importexec-sourcefile-description'), type: SettingType.File, required: true },
                    { parameter: 'sourceFunction', label: t('adapter.js-engine.importexec-sourcefunction'), description: t('adapter.js-engine.importexec-sourcefunction-description'), type: SettingType.Text, required: false },
                    { parameter: 'sourceArgs', label: t('adapter.args'), description: t('adapter.args-description'), type: SettingType.Args, required: false },
                ]
            },
        ]
    }

    private adapterApi: {
        importJs: (path: string) => Promise<unknown>;
        internal: {
            createRenderer: ( container: HTMLElement, sourcePath: string, component: Component ) => ResultRenderer;
            execute: ( params: EngineExecutionParams) => Promise<JsExecution>;
            executeFile: ( filename: string, config: { container: HTMLElement | undefined, component: Component }) => Promise<JsEngineResult>;
        };
    } | null;
    private adapterPlugin: { 
        api: unknown;
        settings: Record<string, string>;
    } & Plugin | null;

    constructor(noteToolbar: NoteToolbarPlugin) {
        const plugin = noteToolbar.app.plugins.plugins[ItemType.JsEngine] as { api: unknown, settings: unknown } & Plugin;
        super(noteToolbar);
        this.adapterPlugin = plugin as typeof this.adapterPlugin;
        this.adapterApi = this.adapterPlugin?.api as typeof this.adapterApi;
    }

    disable() {
        this.ntb = null;
        this.adapterApi = null;
        this.adapterPlugin = null;;
    }
    
    getSetting(settingName: string): string {
        return this.adapterPlugin ? this.adapterPlugin.settings[settingName] : '';
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
                    : t('adapter.js-engine.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'evaluateInline':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl, ErrorBehavior.Report)
                    : t('adapter.js-engine.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'evaluateIgnore':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl, ErrorBehavior.Ignore)
                    : t('adapter.js-engine.eval-expr-error-required');
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, containerEl)
                    : t('adapter.js-engine.exec-sourcefile-error-required');
                break;
            case 'importExec':
                result = config.sourceFile
                    ? await this.importExec(config.sourceFile, config.sourceFunction, config.sourceArgs)
                    : t('adapter.js-engine.importexec-sourcefile-error-required');
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
     * Wrapper for execute() with a provided code string.
     * @example
     * return app.workspace.activeEditor.file.basename
     * @param expression
     * @param containerEl
     * @param displayErrors
     * @returns
     */
    evaluate = async (expression: string, containerEl?: HTMLElement, errorBehavior: ErrorBehavior = ErrorBehavior.Display): Promise<string> => {

        if (!this.adapterApi) return '';

        let result = '';
        const resultEl = containerEl || createSpan();

        const activeFile = this.ntb?.app.workspace.getActiveFile();

        const component = new Component();
		component.load();
        try {
            containerEl?.empty();
            if (!activeFile) {
                this.displayScriptError(t('adapter.error.query-note-not-open'));
                return t('adapter.error.query-note-not-open');
            }            
            const context: ExecutionContext = {
                executionSource: 'markdown-other',
                file: activeFile
            }
            const params: EngineExecutionParams = {
                code: expression,
                container: resultEl,
                component: component,
                context: context
            };
            const execution = await this.adapterApi?.internal.execute(params);
            if (execution.functionBuildError) throw execution.functionBuildError;
            if (execution.functionRunError) throw execution.functionRunError;
            result = execution.result as string;
        }
        catch (error) {
            switch (errorBehavior) {
                case ErrorBehavior.Display:
                    this.displayScriptError(error);
                    break;
                case ErrorBehavior.Report:
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
    importExec = async (filename: string, functionName?: string, argsJson?: string): Promise<string> => {

        let result;

        let args;
        try {
            args = argsJson ? importArgs(argsJson) : {};
        }
        catch (error) {
            this.displayScriptError(error, t('adapter.error.args-parsing', { filename: filename }));
            return t('adapter.error.args-parsing-error', { filename: filename, error: error });
        }
        
        if (this.adapterApi) {
            // const module = await this.adapterApi.importJs(filename);
            const module = await this.adapterApi.importJs(filename) as Record<string, unknown>;
            if (module && functionName) {
                if (module[functionName] && (typeof module[functionName] === 'function')) {
                    try {
                        if (args) {
                            result = (module[functionName] as (...args: unknown[]) => unknown)(this.adapterApi, args);
                        }
                        else {
                            result = (module[functionName] as (...args: unknown[]) => unknown)(this.adapterApi);
                        }
                        this.ntb?.debug('importExec() result:', result);
                    }
                    catch (error) {
                        this.displayScriptError(error, t('adapter.error.exec-failed', { filename: filename }));
                    }
                }
                else {
                    this.displayScriptError(t('adapter.error.function-not-found', { function: functionName }));
                }
            }
        }
        return result as string;

    }

    /**
     * Wraps internal.executeFile()  
     * @param filename 
     * @param containerEl 
     * @returns 
     */
    exec = async (filename: string, containerEl?: HTMLElement): Promise<string> => {

        let result = '';
        const resultEl = containerEl || createSpan();

        const activeFile = this.ntb?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path ?? '';

        const component = new Component();
        component.load();
        try {
            containerEl?.empty();
            const execution = await this.adapterApi?.internal.executeFile(filename, {
                container: resultEl,
                component: component,
            });
            this.ntb?.debug('exec() result:', execution?.result);
            if (containerEl) {
                const renderer = this.adapterApi?.internal.createRenderer(resultEl, activeFilePath, component);
                await renderer?.render(execution?.result);
                // await MarkdownRenderer.render(this.plugin.app, execution.result, resultEl, activeFilePath, this.plugin);
            }
            else {
                result = execution?.result?.content || (execution?.result || '') as string;
            }
        }
        catch (error) {
            this.displayScriptError(error, t('adapter.error.exec-failed', { filename: filename }), containerEl);
        }
        finally {
            component.unload();
        }

        return result;

    }

}
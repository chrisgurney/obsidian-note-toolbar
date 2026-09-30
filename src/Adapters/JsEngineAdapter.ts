import NoteToolbarPlugin from "main";
import { Component, Plugin, TFile } from "obsidian";
import { ItemType, ScriptConfig, ScriptContext, SettingType, t } from "Settings/NoteToolbarSettings";
import { learnMoreFr } from "Settings/UI/Utils/SettingsUIUtils";
import { AdapterFunction } from "Types/interfaces";
import { Adapter } from "./Adapter";

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

    constructor(ntb: NoteToolbarPlugin) {
        const plugin = ntb.app.plugins.plugins[ItemType.JsEngine] as { api: unknown, settings: unknown } & Plugin;
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
        
        const containerEl = this.ntb.adapters.utils.checkContainer(config.outputContainer);

        switch (config.pluginFunction) {
            case 'evaluate':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.js-engine.eval-expr-error-required'), errorContext);
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'evaluateInline':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.js-engine.eval-expr-error-required'), errorContext);
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'evaluateIgnore':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.js-engine.eval-expr-error-required'), errorContext);
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, errorContext, containerEl)
                    : this.ntb.adapters.utils.displayError(t('adapter.js-engine.exec-sourcefile-error-required'), errorContext);
                break;
            case 'importExec':
                result = config.sourceFile
                    ? await this.importExec(config.sourceFile, errorContext, config.sourceFunction, config.sourceArgs)
                    : this.ntb.adapters.utils.displayError(t('adapter.js-engine.importexec-sourcefile-error-required'), errorContext);
                break;
            default:
                this.ntb.adapters.utils.displayError(t('adapter.error.function-invalid', { function: config.pluginFunction }), errorContext);
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
    evaluate = async (
        expression: string,
        errorContext: ScriptContext,
        containerEl?: HTMLElement,
    ): Promise<string> => {

        if (!this.adapterApi) return '';

        let result = '';
        const resultEl = containerEl || createSpan();

        const activeFile = this.ntb.app.workspace.getActiveFile();

        const component = new Component();
		component.load();
        try {
            containerEl?.empty();
            if (!activeFile) {
                this.ntb.adapters.utils.displayError(t('adapter.error.query-note-not-open'));
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
            result = this.ntb.adapters.utils.handleError(error, expression, errorContext, containerEl) ?? result;
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
    importExec = async (
        filename: string, 
        errorContext: ScriptContext,
        functionName?: string, 
        argsJson?: string
    ): Promise<string> => {

        let result;

        const args = this.ntb.adapters.utils.checkArgs(argsJson, errorContext);
        if (!args) return '';
        // ^ was previously:
        // if (importedArgs.value === null) {
        //     return t('adapter.error.args-parsing-script-error', { filename: filename, error: importedArgs.error });
        // }

        // FIXME: this isn't necessarily the same as the executed file (check what importJs does internally)
        // const scriptFile = checkFileLink(this.ntb, filename);
        errorContext['scriptFile'] = filename;

        if (this.adapterApi) {
            const module = await this.adapterApi.importJs(filename) as Record<string, unknown>;
            if (module && functionName) {
                this.ntb.debug('Note Toolbar: Executing:\n', module[functionName]);
                if (module[functionName] && (typeof module[functionName] === 'function')) {
                    try {
                        if (args) {
                            result = (module[functionName] as (...args: unknown[]) => unknown)(this.adapterApi, args);
                        }
                        else {
                            result = (module[functionName] as (...args: unknown[]) => unknown)(this.adapterApi);
                        }
                        this.ntb.debug('importExec() result:', result);
                    }
                    catch (error) {
                        result = this.ntb.adapters.utils.handleError(error, String(module[functionName]), errorContext) ?? result;
                    }
                }
                else {
                    result = this.ntb.adapters.utils.handleError(t('adapter.error.function-not-found', { function: functionName }), String(module[functionName]), errorContext) ?? result;
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
    exec = async (
        filename: string,
        errorContext: ScriptContext,
        containerEl?: HTMLElement
    ): Promise<string> => {

        let result = '';
        const resultEl = containerEl || createSpan();

        const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path ?? '';
        // FIXME: this isn't necessarily the same as the executed file (check what executeFile does internally)
        // const scriptFile = checkFileLink(this.ntb, filename);

        const component = new Component();
        component.load();
        try {
            containerEl?.empty();
            this.ntb.debug(`Note Toolbar: Executing:\n${filename}`);
            const execution = await this.adapterApi?.internal.executeFile(filename, {
                container: resultEl,
                component: component,
            });
            this.ntb.debug('exec() result:', execution?.result);
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
            // NOTE: it appears errors from JS Engine's executeFile are not thrown up to here...
            errorContext['scriptFile'] = filename;
            result = this.ntb.adapters.utils.handleError(error, '', errorContext, containerEl) ?? result;
        }
        finally {
            component.unload();
        }

        return result;

    }

}
import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Notice } from "obsidian";
import { ErrorBehavior, ItemType, ScriptConfig, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { debugLog, displayScriptError, importArgs } from "Utils/Utils";
import { Adapter } from "./Adapter";
import { learnMoreFr } from "Settings/UI/Utils/SettingsUIUtils";

/**
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/API.ts
 * @link https://github.com/mProjectsCode/obsidian-js-engine-plugin/blob/master/jsEngine/api/Internal.ts
 * @link Discord thread: https://discord.com/channels/686053708261228577/1286803892549713921
 */
export default class JsEngineAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.evaluate,
            label: t('adapter.js-engine.eval-function'),
            description: "",
            parameters: [
                { parameter: 'expression', label: t('adapter.js-engine.eval-expr'), description: t('adapter.js-engine.eval-expr-description'), type: SettingType.TextArea, required: true },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.exec,
            label: t('adapter.js-engine.exec-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.js-engine.exec-sourcefile'), description: t('adapter.js-engine.exec-sourcefile-description'), type: SettingType.File, required: true },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: learnMoreFr(t('adapter.outputcontainer-description'), '/Executing-scripts#output-callout'), type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.importExec,
            label: t('adapter.js-engine.importexec-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.js-engine.importexec-sourcefile'), description: t('adapter.js-engine.importexec-sourcefile-description'), type: SettingType.File, required: true },
                { parameter: 'sourceFunction', label: t('adapter.js-engine.importexec-sourcefunction'), description: t('adapter.js-engine.importexec-sourcefunction-description'), type: SettingType.Text, required: false },
                { parameter: 'sourceArgs', label: t('adapter.args'), description: t('adapter.args-description'), type: SettingType.Args, required: false },
            ]
        },
    ];

    constructor(noteToolbar: NoteToolbarPlugin) {
        const plugin = (noteToolbar.app as any).plugins.plugins[ItemType.JsEngine];
        super(noteToolbar, plugin, plugin.api);
    }

    /**
     * @see Adapter.use
     */    
    async use(config: ScriptConfig): Promise<string | void> {
        let result;
        
        let containerEl;
        if (config.outputContainer) {
            containerEl = this.noteToolbar?.getOutputEl(config.outputContainer);
            if (!containerEl) {
                displayScriptError(t('adapter.error.callout-not-found', { id: config.outputContainer }));
                return;
            }
        }

        switch (config.pluginFunction) {
            // internal function for inline evaluations in which errors should be reported
            case 'evaluateInline':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl, ErrorBehavior.Report)
                    : "Error: A JavaScript expression is required";
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'evaluateIgnore':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl, ErrorBehavior.Ignore)
                    : "Error: A JavaScript expression is required";
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
    async evaluate(expression: string, containerEl?: HTMLElement, errorBehavior: ErrorBehavior = ErrorBehavior.Display): Promise<string> {

        let result = '';
        let resultEl = containerEl || createSpan();

        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();

        const component = new Component();
		component.load();
        try {
            containerEl?.empty();
            let context = {};
            if (activeFile) {
                context = {
                    executionSource: 'markdown-other',
                    file: activeFile
                }
            }
            const execution = await this.adapterApi.internal.execute({
                code: expression,
                container: resultEl,
                component: component,
                context: context
            });
            if (execution.functionBuildError) throw execution.functionBuildError;
            if (execution.functionRunError) throw execution.functionRunError;
            result = execution.result;
        }
        catch (error) {
            switch (errorBehavior) {
                case ErrorBehavior.Display:
                    displayScriptError(error);
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
    async importExec(filename: string, functionName?: string, argsJson?: string): Promise<string> {

        let result = '';

        let args;
        try {
            args = argsJson ? importArgs(argsJson) : {};
        }
        catch (error) {
            displayScriptError(t('adapter.error.args-parsing', { filename: filename }), error);
            return t('adapter.error.args-parsing-error', { filename: filename, error: error });
        }
        
        if (this.adapterApi) {
            let module = await this.adapterApi.importJs(filename);
            if (functionName) {
                if (module[functionName] && (typeof module[functionName] === 'function')) {
                    try {
                        if (args) {
                            result = module[functionName](this.adapterApi, args);
                        }
                        else {
                            result = module[functionName](this.adapterApi);
                        }
                        debugLog('importExec() result:', result);
                    }
                    catch (error) {
                        displayScriptError(t('adapter.error.exec-failed', { filename: filename }), error);
                    }
                }
                else {
                    displayScriptError(t('adapter.error.function-not-found', { function: functionName }));
                }
            }
        }
        return result;

    }

    /**
     * Wraps internal.executeFile()  
     * @param filename 
     * @param containerEl 
     * @returns 
     */
    async exec(filename: string, containerEl?: HTMLElement): Promise<string> {

        let result = '';
        let resultEl = containerEl || createSpan();

        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path ?? '';

        const component = new Component();
        component.load();
        try {
            containerEl?.empty();
            const execution = await this.adapterApi.internal.executeFile(filename, {
                container: resultEl,
                component: this.noteToolbar,
            });
            debugLog('exec() result:', execution.result);
            if (this.noteToolbar) {
                if (containerEl) {
                    const renderer = this.adapterApi.internal.createRenderer(resultEl, activeFilePath, this.noteToolbar);
                    renderer.render(execution.result);
                    // await MarkdownRenderer.render(this.plugin.app, execution.result, resultEl, activeFilePath, this.plugin);
                }
                else {
                    result = execution.result || '';
                }
            }
        }
        catch (error) {
            displayScriptError(t('adapter.error.exec-failed', { filename: filename }), error, containerEl);
        }
        finally {
            component.unload();
        }

        return result;

    }

}
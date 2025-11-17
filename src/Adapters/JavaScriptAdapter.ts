import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer } from "obsidian";
import { ErrorBehavior, ScriptConfig, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { importArgs } from "Utils/Utils";
import { Adapter } from "./Adapter";

/**
 * Adapter for JavaScript scripts.
 */
export default class JavaScriptAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.evaluate,
            label: t('adapter.javascript.eval-function'),
            description: "",
            parameters: [
                { parameter: 'expression', label: t('adapter.javascript.eval-expr'),  description: t('adapter.javascript.eval-expr-description'), type: SettingType.TextArea, required: true },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.exec,
            label: t('adapter.javascript.exec-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.javascript.exec-sourcefile'), description: t('adapter.javascript.exec-sourcefile-description'), type: SettingType.File, required: true },
                { parameter: 'sourceArgs', label: t('adapter.args'), description: t('adapter.args-description'), type: SettingType.Args, required: false },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
    ];

    constructor(noteToolbar: NoteToolbarPlugin) {
        super(noteToolbar, null, null);
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
                    ? await this.evaluate(config.expression, undefined, containerEl)
                    : t('adapter.javascript.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'evaluateInline':
                result = config.expression
                    ? await this.evaluate(config.expression, undefined, containerEl, ErrorBehavior.Report)
                    : t('adapter.javascript.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'evaluateIgnore':
                result = config.expression
                    ? await this.evaluate(config.expression, undefined, containerEl, ErrorBehavior.Ignore)
                    : t('adapter.javascript.eval-expr-error-required');
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, config.sourceArgs, containerEl)
                    : t('adapter.javascript.exec-error-required');
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
     * Executes the given JavaScript file.
     * 
     * @example
     * console.log(`Hello ${args['name']}`);
     * new Notice(`Hello ${args['name']}`);
     * 
     * @param filename 
     * @param argsJson
     * @param containerEl 
     * @returns 
     */
    private async exec(filename: string, argsJson?: string, containerEl?: HTMLElement) {

        if (!filename) {
            return;
        }
        
        const activeFilePath = this.ntb?.app.workspace.getActiveFile()?.path || '';

        let viewFile = this.ntb?.app.metadataCache.getFirstLinkpathDest(filename, activeFilePath);
        if (!viewFile) {
            this.displayScriptError(t('adapter.error.file-not-found', { filename: filename }));
            return;
        }

        let contents = await this.ntb?.app.vault.read(viewFile);

        if (contents) {
            await this.evaluate(contents, argsJson, containerEl, ErrorBehavior.Report);
        }

    }

    /**
     * Evaluates the given JavaScript expression.
     * 
     * @param expression 
     * @param containerEl 
     * @param errorBehavior 
     * @returns 
     */    
    private async evaluate(
        expression: string,
        argsJson?: string,
        containerEl?: HTMLElement,
        errorBehavior: ErrorBehavior = ErrorBehavior.Display
    ): Promise<string> {
                
        let result = '';
        let resultEl = containerEl || createSpan();

        let args;
        try {
            args = argsJson ? importArgs(argsJson) : {};
        }
        catch (error) {
            this.displayScriptError(t('adapter.error.args-parsing'));
            return t('adapter.error.args-parsing-error', { error: error });
        }

        const activeFile = this.ntb?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path || '';

        if (expression) {
            if (expression.includes("await")) expression = "(async () => { " + expression + " })()";
            // TODO: not sure if this is needed for some reason when evaluating files? (from DataviewAdapter)
            // expression += `\n//# sourceURL=${viewFile.path}`;
            let func = new Function("input", expression);
            const component = new Component();
            component.load();
            try {
                resultEl.empty();
                this.ntb?.debug(expression);
                // may directly render, in which case it will likely return undefined or null
                result = await Promise.resolve(func(args));
                if (containerEl && result && this.ntb) {
                    MarkdownRenderer.render(
                        this.ntb.app,
                        result,
                        resultEl,
                        activeFilePath,
                        component
                    );
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

        }

        return result;

    }

}
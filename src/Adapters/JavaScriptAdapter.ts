import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer } from "obsidian";
import { ScriptConfig, ScriptContext, SettingType, t } from "Settings/NoteToolbarSettings";
import { learnMoreFr } from "Settings/UI/Utils/SettingsUIUtils";
import { AdapterFunction } from "Types/interfaces";
import { Adapter } from "./Adapter";
import { checkArgs, checkFileLink, checkOutputContainer, displayScriptError, formatExpression, handleScriptError } from "./AdapterUtils";

/**
 * Adapter for JavaScript scripts.
 */
export default class JavaScriptAdapter extends Adapter {

    get FUNCTIONS(): AdapterFunction[] {
        return [
            {
                name: 'evaluate',
                function: this.evaluate as (...args: unknown[]) => Promise<string>,
                label: t('adapter.javascript.eval-function'),
                description: "",
                parameters: [
                    { parameter: 'expression', label: t('adapter.javascript.eval-expr'),  description: learnMoreFr(t('adapter.javascript.eval-expr-description'), 'Note-Toolbar-API', t('api.link-name')), type: SettingType.TextArea, required: true },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
                ]
            },
            {
                name: 'exec',
                function: this.exec as (...args: unknown[]) => Promise<string>,
                label: t('adapter.javascript.exec-function'),
                description: "",
                parameters: [
                    { parameter: 'sourceFile', label: t('adapter.javascript.exec-sourcefile'), description: t('adapter.javascript.exec-sourcefile-description'), type: SettingType.File, required: true },
                    { parameter: 'sourceArgs', label: t('adapter.args'), description: t('adapter.args-description'), type: SettingType.Args, required: false },
                    { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
                ]
            },
        ];
    }

    constructor(noteToolbar: NoteToolbarPlugin) {
        super(noteToolbar);
    }

    disable() {
    }
    
    getSetting(_settingName: string): string {
        return '';
    }

    /**
     * @see {@link Adapter.use}
     */
    async use(config: ScriptConfig, errorContext: ScriptContext): Promise<string | void> {
        
        let result;

        const containerEl = checkOutputContainer(this.ntb, config.outputContainer);

        switch (config.pluginFunction) {
            case 'evaluate':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, undefined, containerEl)
                    : t('adapter.javascript.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'evaluateInline':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, undefined, containerEl)
                    : t('adapter.javascript.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'evaluateIgnore':
                result = config.expression
                    ? await this.evaluate(config.expression, errorContext, undefined, containerEl)
                    : t('adapter.javascript.eval-expr-error-required');
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, errorContext, config.sourceArgs, containerEl)
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
    private exec = async (
        filename: string,
        errorContext: ScriptContext,
        argsJson?: string,
        containerEl?: HTMLElement,
    ): Promise<string | undefined> => {

        if (!filename) return;

        const scriptFile = checkFileLink(this.ntb, filename);
        if (!scriptFile) return;

        const contents = await this.ntb.app.vault.cachedRead(scriptFile);
        if (contents.trim()) {
            this.ntb.debug(`Note Toolbar: Executing: ${scriptFile.path}`);
            errorContext['scriptFile'] = scriptFile;
            return await this.evaluate(contents, errorContext, argsJson, containerEl);
        }
        else {
            displayScriptError(t('adapter.error.file-empty', { filename: filename }));
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
    private evaluate = async (
        expression: string,
        errorContext: ScriptContext,
        argsJson?: string,
        containerEl?: HTMLElement
    ): Promise<string> => {
                
        let result;
        const resultEl = containerEl || createSpan();

        const args = checkArgs(argsJson, containerEl);
        if (!args) return '';

        const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path || '';

        if (expression) {
            const component = new Component();
            component.load();
            try {
                const func = new JavaScriptAdapter.AsyncFunction("input", expression);
                resultEl.empty();
                this.ntb.debug('Note Toolbar: Evaluating:\n', formatExpression(expression));
                // may directly render, in which case it will likely return undefined or null
                result = await Promise.resolve((func as (...args: unknown[]) => unknown)(args));
                if (containerEl && result && this.ntb) {
                    await MarkdownRenderer.render(
                        this.ntb.app,
                        result as string,
                        resultEl,
                        activeFilePath,
                        component
                    );
                }
            }
            catch (error) {
                result = handleScriptError(this.ntb, error, expression, errorContext, containerEl) ?? result;
            }
            finally {
                component.unload();
            }

        }

        return result as string;

    }

}
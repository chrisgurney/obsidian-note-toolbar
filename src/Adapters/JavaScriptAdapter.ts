import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer } from "obsidian";
import { ErrorBehavior, ScriptConfig, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { debugLog, displayScriptError } from "Utils/Utils";
import { Adapter } from "./Adapter";

/**
 * Adapter for JavaScript scripts.
 */
export default class JavaScriptAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.exec,
            label: t('adapter.javascript.exec-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.javascript.exec-sourcefile'), description: t('adapter.javascript.exec-sourcefile-description'), type: SettingType.File, required: true },
                { parameter: 'outputContainer', label: t('adapter.outputcontainer'), description: t('adapter.outputcontainer-description'), type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.evaluate,
            label: t('adapter.javascript.eval-function'),
            description: "",
            parameters: [
                { parameter: 'expression', label: t('adapter.javascript.eval-expr'),  description: t('adapter.javascript.eval-expr-description'), type: SettingType.TextArea, required: true },
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
            containerEl = this.noteToolbar?.getOutputEl(config.outputContainer);
            if (!containerEl) {
                displayScriptError(t('adapter.error.callout-not-found', { id: config.outputContainer }));
                return;
            }
        }

        switch (config.pluginFunction) {
            case 'evaluate':
                result = config.expression
                    ? await this.evaluate(config.expression, containerEl)
                    : t('adapter.javascript.eval-expr-error-required');
                break;
            case 'exec':
                result = config.sourceFile
                    ? await this.exec(config.sourceFile, containerEl)
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
     * @param filename 
     * @param containerEl 
     * @returns 
     */
    private async exec(filename: string, containerEl?: HTMLElement) {

        if (!filename) {
            return;
        }
        
        const activeFilePath = this.noteToolbar?.app.workspace.getActiveFile()?.path || '';

        let viewFile = this.noteToolbar?.app.metadataCache.getFirstLinkpathDest(filename, activeFilePath);
        if (!viewFile) {
            // TODO: render messages into the container, if provided
            displayScriptError(t('adapter.error.file-not-found', { filename: filename }));
            return;
        }

        let contents = await this.noteToolbar?.app.vault.read(viewFile);

        if (contents) {
            await this.evaluate(contents, containerEl, ErrorBehavior.Report);
        }

        // TODO? displayScriptError(t('adapter.error.exec-failed', { filename: viewFile.path }), error, containerEl);

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
        containerEl?: HTMLElement,
        errorBehavior: ErrorBehavior = ErrorBehavior.Display
    ): Promise<string> {
                
        let result = '';
        let resultEl = containerEl || createSpan();

        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        const activeFilePath = activeFile?.path || '';

        if (expression) {
            if (expression.includes("await")) expression = "(async () => { " + expression + " })()";
            // expression += `\n//# sourceURL=${viewFile.path}`;
            let func = new Function("dv", "input", expression);
            const component = new Component();
            component.load();
            try {
                resultEl.empty();
                // from dv.view: may directly render, in which case it will likely return undefined or null
                let result = await Promise.resolve(func());
                if (result && this.noteToolbar) {
                    MarkdownRenderer.render(
                        this.noteToolbar.app,
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
                        displayScriptError(t('adapter.error.expr-failed', { expression: expression }), error, containerEl);
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
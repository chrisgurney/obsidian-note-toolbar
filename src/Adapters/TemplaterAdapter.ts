import NoteToolbarPlugin from "main";
import { ErrorBehavior, ItemType, ScriptConfig, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { Adapter } from "./Adapter";

/**
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/Templater.ts
 */
export default class TemplaterAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.appendTemplate,
            label: t('adapter.templater.append-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.templater.append-sourcefile'), description: t('adapter.templater.append-sourcefile-description'), type: SettingType.File, required: true },
            ]
        },
        {
            function: this.createFrom,
            label: t('adapter.templater.create-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.templater.create-sourcefile'), description: t('adapter.templater.create-sourcefile-description'), type: SettingType.File, required: true },
                { parameter: 'outputFile', label: t('adapter.templater.create-outputfile'), description: t('adapter.templater.create-outputfile-description'), type: SettingType.Text, required: false },
                { parameter: 'postCommand', label: t('adapter.postCommand'), description: t('adapter.postCommand-description'), type: SettingType.Command, required: false }
            ]
        },
        {
            function: this.parseTemplate,
            label: t('adapter.templater.eval-function'),
            description: "",
            parameters: [
                { parameter: 'expression', label: t('adapter.templater.eval-expr'), description: t('adapter.templater.eval-expr-description'), type: SettingType.TextArea, required: true },
            ]
        },
        {
            function: this.parseTemplateFile,
            label: t('adapter.templater.exec-function'),
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: t('adapter.templater.exec-sourcefile'), description: t('adapter.templater.exec-sourcefile-description'), type: SettingType.File, required: true },
            ]
        },        
    ];

    constructor(noteToolbar: NoteToolbarPlugin) {
        const plugin = (noteToolbar.app as any).plugins.plugins[ItemType.Templater];
        super(noteToolbar, plugin, plugin.templater);
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
            case 'appendTemplate':
                result = config.sourceFile
                    ? await this.appendTemplate(config.sourceFile)
                    : t('adapter.templater.append-sourcefile-error-required');
                break;
            case 'createFrom':
                result = config.sourceFile
                    ? await this.createFrom(config.sourceFile, config.outputFile)
                    : t('adapter.templater.create-sourcefile-error-required');
                break;
            case 'parseTemplate':
                result = config.expression
                    ? await this.parseTemplate(config.expression)
                    : t('adapter.templater.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'parseInline':
                result = config.expression
                    ? await this.parseTemplate(config.expression, ErrorBehavior.Report)
                    : t('adapter.templater.eval-expr-error-required');
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'parseIgnore':
                result = config.expression
                    ? await this.parseTemplate(config.expression, ErrorBehavior.Ignore)
                    : t('adapter.templater.eval-expr-error-required');
                break;
            case 'parseTemplateFile':
                result = config.sourceFile
                    ? await this.parseTemplateFile(config.sourceFile)
                    : t('adapter.templater.exec-sourcefile-error-required');
                break;
            case '':
                // do nothing
                break;
            default:
                result = t('adapter.error.function-invalid', { function: config.pluginFunction });
                break;
        }

        if (config.postCommand) {
            try {
                await this.ntb?.app.commands.executeCommandById(config.postCommand);
            } 
            catch (error) {
                throw new Error(error);
            }
        }

        return result;
    }
    
    /**
     * Calls append_template_to_active_file.
     * @param filename 
     */
    async appendTemplate(filename: string): Promise<void> {

        if (this.adapterApi) {
            let templateFile = this.ntb?.app.vault.getFileByPath(filename);
            try {
                if (templateFile) {
                    await this.adapterApi.append_template_to_active_file(templateFile);
                }
                else {
                    throw new Error(t('adapter.error.file-not-found', { filename: filename }));
                }
            }
            catch (error) {
                this.displayScriptError(error);
            }
        }

    }

    /**
     * Calls create_new_note_from_template.
     * @param filename 
     * @param outputFile 
     */
    async createFrom(filename: string, outputFile?: string): Promise<void> {

		if (outputFile && this.ntb?.vars.hasVars(outputFile)) {
            const activeFile = this.ntb?.app.workspace.getActiveFile();
			outputFile = await this.ntb?.vars.replaceVars(outputFile, activeFile);
        }

        const { parsedFolder, parsedFilename } = this.parseOutputFile(outputFile);
        let outputFolder = outputFile ? parsedFolder : '';
        let outputFilename = outputFile ? parsedFilename : '';

        if (this.adapterApi) {
            let templateFile = this.ntb?.app.vault.getFileByPath(filename);
            try {
                if (templateFile) {
                    await this.adapterApi.create_new_note_from_template(templateFile, outputFolder, outputFilename);
                }
                else {
                    throw new Error(t('adapter.error.file-not-found', { filename: filename }));
                }
            }
            catch (error) {
                this.displayScriptError(error);
            }
        }

    }

    parseOutputFile(outputFile?: string): { parsedFolder: string; parsedFilename: string } {
        if (!outputFile) return { parsedFolder: '', parsedFilename: '' };
        const normalizedPath = outputFile.replace(/\\/g, '/'); // normalize Windows paths
        const lastSlashIndex = normalizedPath.lastIndexOf('/');
        const folder = normalizedPath.slice(0, lastSlashIndex + 1);
        const filename = normalizedPath.slice(lastSlashIndex + 1);
        return { parsedFolder: folder, parsedFilename: filename };
    }

    /**
     * @example
     * <%tp.file.creation_date()%>
     * (Open and close tags are optional.)
     * @param expression 
     * @param errorBehavior
     * @returns 
     */
    async parseTemplate(expression: string, errorBehavior: ErrorBehavior = ErrorBehavior.Display): Promise<string> {

        let result = '';

        const activeFile = this.ntb?.app.workspace.getActiveFile();
        if (!activeFile && errorBehavior === ErrorBehavior.Display) {
            this.displayScriptError(t('adapter.error.expr-note-not-open'));
            return t('adapter.error.expr-note-not-open');
        }

        // make sure the opening and closing tags are present, in case they're omitted
        let expressionToEval = expression.trim();
        if (!expressionToEval.startsWith('<%')) expressionToEval = '<%' + expressionToEval;
        if (!expressionToEval.endsWith('%>')) expressionToEval += '%>';

        try {
            const config = {
                target_file: activeFile,
                run_mode: 'DynamicProcessor',
                active_file: activeFile
            };
            if (this.adapterApi) {
                result = await this.adapterApi.parse_template(config, expressionToEval);
                result = (result === 'undefined') ? '' : result;
            }
        }
        catch (error) {
            switch (errorBehavior) {
                case ErrorBehavior.Display:
                    this.displayScriptError(error);
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

        return result;

    }

    /**
     * @example
     * Works with file containing:
     * <%
     * tp.file.creation_date()
     * %>
     * @param filename 
     * @returns 
     */
    async parseTemplateFile(filename: string): Promise<string> {

        let result = '';

        const activeFile = this.ntb?.app.workspace.getActiveFile();
        if (!activeFile) {
            this.displayScriptError(t('adapter.error.function-note-not-open'));
            return t('adapter.error.function-note-not-open');
        }

        let templateFile = this.ntb?.app.vault.getFileByPath(filename);
        try {
            if (templateFile) {
                const config = { 
                    template_file: templateFile,
                    target_file: activeFile,
                    run_mode: 'DynamicProcessor',
                    active_file: activeFile
                };
                if (this.adapterApi) {
                    result = await this.adapterApi.read_and_parse_template(config);
                    this.ntb?.debug("parseTemplateFile() result:", result);
                }    
            }
            else {
                throw new Error(t('adapter.error.file-not-found', { filename: filename }));
            }
        }
        catch (error) {
            this.displayScriptError(t('adapter.error.exec-failed', { filename: filename }), error);
        }

        return result;

    }
    
}
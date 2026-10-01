import NoteToolbarPlugin from "main";
import { Plugin, TFile } from "obsidian";
import { ErrorBehavior, ItemType, ScriptConfig, ScriptContext, SettingType, t } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { Adapter } from "./Adapter";

type TemplaterRunningConfig = {
    template_file: TFile | undefined;
    target_file: TFile;
    run_mode: 'DynamicProcessor';
    active_file?: TFile | null;
};

/**
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/Templater.ts
 */
export default class TemplaterAdapter extends Adapter {

    get FUNCTIONS(): AdapterFunction[] {
        return [
            {
                name: 'appendTemplate',
                function: this.appendTemplate as (...args: unknown[]) => Promise<string>,
                label: t('adapter.templater.append-function'),
                description: "",
                parameters: [
                    { parameter: 'sourceFile', label: t('adapter.templater.append-sourcefile'), description: t('adapter.templater.append-sourcefile-description'), type: SettingType.File, required: true },
                ]
            },
            {
                name: 'createFrom',
                function: this.createFrom as (...args: unknown[]) => Promise<string>,
                label: t('adapter.templater.create-function'),
                description: "",
                parameters: [
                    { parameter: 'sourceFile', label: t('adapter.templater.create-sourcefile'), description: t('adapter.templater.create-sourcefile-description'), type: SettingType.File, required: true },
                    { parameter: 'outputFile', label: t('adapter.templater.create-outputfile'), description: t('adapter.templater.create-outputfile-description'), type: SettingType.Text, required: false },
                    { parameter: 'postCommand', label: t('adapter.postCommand'), description: t('adapter.postCommand-description'), type: SettingType.Command, required: false }
                ]
            },
            {
                name: 'parseTemplate',
                function: this.parseTemplate as (...args: unknown[]) => Promise<string>,
                label: t('adapter.templater.eval-function'),
                description: "",
                parameters: [
                    { parameter: 'expression', label: t('adapter.templater.eval-expr'), description: t('adapter.templater.eval-expr-description'), type: SettingType.TextArea, required: true },
                ]
            },
            {
                name: 'parseTemplateFile',
                function: this.parseTemplateFile as (...args: unknown[]) => Promise<string>,
                label: t('adapter.templater.exec-function'),
                description: "",
                parameters: [
                    { parameter: 'sourceFile', label: t('adapter.templater.exec-sourcefile'), description: t('adapter.templater.exec-sourcefile-description'), type: SettingType.File, required: true },
                ]
            },        
        ];
    }

    private adapterApi: {
        append_template_to_active_file: (f: TFile) => Promise<void>;
        create_new_note_from_template: (template: TFile, folder: string, filename: string) => Promise<void>;
        read_and_parse_template: (config: TemplaterRunningConfig) => Promise<string>;
        parse_template: (config: TemplaterRunningConfig, template: string) => Promise<string>;
    } | null;
    private adapterPlugin: { 
        templater: unknown; 
        settings: Record<string, string>;
    } & Plugin | null;

    constructor(ntb: NoteToolbarPlugin) {
        const plugin = ntb.app.plugins.plugins[ItemType.Templater] as { templater: unknown, settings: unknown } & Plugin;
        super(ntb);
        this.adapterPlugin = plugin as typeof this.adapterPlugin;
        this.adapterApi = this.adapterPlugin?.templater as typeof this.adapterApi;
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
        
        switch (config.pluginFunction) {
            case 'appendTemplate':
                result = config.sourceFile
                    ? await this.appendTemplate(config.sourceFile, errorContext)
                    : this.ntb.adapters.utils.displayError(t('adapter.templater.append-sourcefile-error-required'), errorContext);
                break;
            case 'createFrom':
                result = config.sourceFile
                    ? await this.createFrom(config.sourceFile, errorContext, config.outputFile)
                    : this.ntb.adapters.utils.displayError(t('adapter.templater.create-sourcefile-error-required'), errorContext);
                break;
            case 'parseTemplate':
                result = config.expression
                    ? await this.parseTemplate(config.expression, errorContext)
                    : this.ntb.adapters.utils.displayError(t('adapter.templater.eval-expr-error-required'), errorContext);
                break;
            // internal function for inline evaluations in which errors should be reported
            case 'parseInline':
                result = config.expression
                    ? await this.parseTemplate(config.expression, errorContext)
                    : this.ntb.adapters.utils.displayError(t('adapter.templater.eval-expr-error-required'), errorContext);
                break;
            // internal function for inline evaluations in which errors can be ignored
            case 'parseIgnore':
                result = config.expression
                    ? await this.parseTemplate(config.expression, errorContext)
                    : this.ntb.adapters.utils.displayError(t('adapter.templater.eval-expr-error-required'), errorContext);
                break;
            case 'parseTemplateFile':
                result = config.sourceFile
                    ? await this.parseTemplateFile(config.sourceFile, errorContext)
                    : this.ntb.adapters.utils.displayError(t('adapter.templater.exec-sourcefile-error-required'), errorContext);
                break;
            default:
                this.ntb.adapters.utils.displayError(t('adapter.error.function-invalid', { function: config.pluginFunction }), errorContext);
                break;
        }

        if (config.postCommand) {
            await this.ntb.app.commands.executeCommandById(config.postCommand);
        }

        return result;
    }
    
    /**
     * Calls append_template_to_active_file.
     * @param filename 
     */
    appendTemplate = async (filename: string, errorContext: ScriptContext): Promise<string> => {

        if (this.adapterApi) {
            const templateFile = this.ntb.adapters.utils.checkFile(filename);
            if (!templateFile) {
                this.ntb.adapters.utils.displayError(t('adapter.error.file-not-found', { filename: filename }), errorContext);
                return '';
            }

            // TODO? show notice instead? errors are not thrown from Templater's code, and there's no feasible way to check success
            errorContext['scriptFile'] = templateFile;
            this.ntb.debug('Note Toolbar: Using:', this.ntb.adapters.utils.formatContext(errorContext));
            await this.adapterApi.append_template_to_active_file(templateFile);
        }

        return ''; // required to satisfy function signature

    }

    /**
     * Calls create_new_note_from_template.
     * @param filename 
     * @param outputFile 
     */
    createFrom = async (filename: string, errorContext: ScriptContext, outputFile?: string): Promise<string> => {

        // replace any variables that might be in the output filename
		if (outputFile && this.ntb.vars.hasVars(outputFile)) {
            const activeFile = this.ntb.app.workspace.getActiveFile();
			outputFile = await this.ntb.vars.replaceVars(outputFile, activeFile, errorContext);
        }

        const { parsedFolder, parsedFilename } = this.parseOutputFile(outputFile);
        const outputFolder = outputFile ? parsedFolder : '';
        const outputFilename = outputFile ? parsedFilename : '';

        if (this.adapterApi) {
            const templateFile = this.ntb.app.vault.getFileByPath(filename);
            if (!templateFile) {
                this.ntb.adapters.utils.displayError(t('adapter.error.file-not-found', { filename: filename }), errorContext);
                return '';
            }

            // TODO? show notice instead? errors are not thrown from Templater's code, and there's no feasible way to check success
            errorContext['scriptFile'] = templateFile;
            this.ntb.debug('Note Toolbar: Using:', this.ntb.adapters.utils.formatContext(errorContext));
            await this.adapterApi.create_new_note_from_template(templateFile, outputFolder, outputFilename);
        }

        return ''; // required to satisfy function signature

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
    parseTemplate = async (
        expression: string,
        errorContext: ScriptContext
    ): Promise<string> => {

        let result = '';

        const activeFile = this.ntb.adapters.utils.checkActiveFile(errorContext.errorBehavior);
        if (!activeFile) return t('adapter.error.expr-note-not-open');

        // make sure the opening and closing tags are present, in case they're omitted
        let expressionToEval = expression.trim();
        if (!expressionToEval.startsWith('<%')) expressionToEval = '<%' + expressionToEval;
        if (!expressionToEval.endsWith('%>')) expressionToEval += '%>';

        try {
            const config: TemplaterRunningConfig = {
                target_file: activeFile,
                template_file: undefined,
                run_mode: 'DynamicProcessor',
                active_file: activeFile
            };
            if (this.adapterApi) {
                result = await this.adapterApi.parse_template(config, expressionToEval);
                result = (result === 'undefined') ? '' : result;
            }
        }
        catch (error) {
            result = this.ntb.adapters.utils.handleError(error, expression, errorContext) ?? result;
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
    parseTemplateFile = async (filename: string, errorContext: ScriptContext) => {

        let result = '';

        const activeFile = this.ntb.adapters.utils.checkActiveFile(ErrorBehavior.Display);
        if (!activeFile) return t('adapter.error.function-note-not-open');

        const templateFile = this.ntb.adapters.utils.checkFile(filename);
        if (!templateFile) return;

        try {
            if (templateFile) {
                const config: TemplaterRunningConfig = { 
                    template_file: templateFile,
                    target_file: activeFile,
                    run_mode: 'DynamicProcessor',
                    active_file: activeFile
                };
                if (this.adapterApi) {
                    result = await this.adapterApi.read_and_parse_template(config);
                    this.ntb.debug("parseTemplateFile() result:", result);
                }    
            }
            else {
                throw new Error(t('adapter.error.file-not-found', { filename: filename }));
            }
        }
        catch (error) {
            errorContext['scriptFile'] = templateFile;
            result = this.ntb.adapters.utils.handleError(error, '', errorContext) ?? result;
        }

        return result;

    }
    
}
import NoteToolbarPlugin from "main";
import { Notice, TFile } from "obsidian";
import { ItemType, ScriptConfig, SettingType } from "Settings/NoteToolbarSettings";
import { AdapterFunction } from "Types/interfaces";
import { debugLog, displayScriptError } from "Utils/Utils";
import { Adapter } from "./Adapter";

/**
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/Templater.ts
 */
export default class TemplaterAdapter extends Adapter {

    readonly FUNCTIONS: AdapterFunction[] = [
        {
            function: this.appendTemplate,
            label: "Insert template",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "Template", description: "Template file to insert.", type: SettingType.File, required: true },
            ]
        },
        {
            function: this.createFrom,
            label: "Create new note from template",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "Template", description: "Template file to create a new file from.", type: SettingType.File, required: true },
                // TODO: 'outputFile', description: "Enter the name of the file to create from the provided template."
            ]
        },
        {
            function: this.parseTemplate,
            label: "Evaluate Templater expression",
            description: "",
            parameters: [
                { parameter: 'expression', label: "Templater expression", description: "Templater expression to evaluate.", type: SettingType.Text, required: true },
            ]
        },
        {
            function: this.parseTemplateFile,
            label: "Evaluate Templater file",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "Template file", description: "Evaluates the contents of the file and returns.", type: SettingType.File, required: true },
            ]
        },        
    ];

    constructor(noteToolbar: NoteToolbarPlugin) {
        const plugin = (noteToolbar.app as any).plugins.plugins[ItemType.Templater];
        super(noteToolbar, plugin, plugin.templater);
    }

    async use(config: ScriptConfig): Promise<string | void> {
        let result;
        
        let containerEl;
        if (config.outputContainer) {
            containerEl = this.noteToolbar?.getOutputEl(config.outputContainer);
            if (!containerEl) {
                new Notice(`Error: Could not find note-toolbar-output callout in current note with ID: ${config.outputContainer}`, 5000);
                return;
            }
        }

        switch (config.pluginFunction) {
            case 'appendTemplate':
                result = config.sourceFile
                    ? await this.appendTemplate(config.sourceFile)
                    : `Error: A template file is required`;
                break;
            case 'createFrom':
                result = config.sourceFile
                    ? await this.createFrom(config.sourceFile)
                    : `Error: A template file is required`;
                break;
            case 'parseTemplate':
                result = config.expression
                    ? await this.parseTemplate(config.expression)
                    : `Error: A Templater expression is required`;
                break;
            case 'parseTemplateFile':
                result = config.sourceFile
                    ? await this.parseTemplateFile(config.sourceFile)
                    : `Error: A Templater file is required`;
                break;
            case '':
                // do nothing
                break;
            default:
                result = `Unsupported function: ${config.pluginFunction}`;
                break;
        }

        return result;
    }
    
    /**
     * Calls append_template_to_active_file.
     * @param filename 
     */
    async appendTemplate(filename: string): Promise<void> {

        if (this.adapterApi) {
            let templateFile = this.noteToolbar?.app.vault.getFileByPath(filename);
            if (templateFile) {
                await this.adapterApi.append_template_to_active_file(templateFile);
            }
            else {
                displayScriptError("File not found: " + filename);
            }
        }

    }

    /**
     * Calls create_new_note_from_template.
     * @param filename 
     */
    async createFrom(filename: string): Promise<void> {

        if (this.adapterApi) {
            let templateFile = this.noteToolbar?.app.vault.getFileByPath(filename);
            if (templateFile) {
                // TODO? future: support for other parms? template: TFile | string, folder?: TFolder | string, filename?: string, open_new_note = true
                let newFile = await this.adapterApi.create_new_note_from_template(templateFile);
            }
            else {
                displayScriptError("File not found: " + filename);
            }
        }

    }

    /**
     * @example
     * <%tp.file.creation_date()%>
     * @param expression 
     * @returns 
     */
    async parseTemplate(expression: string): Promise<string> {

        // debugger;
        let result = '';
        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        if (activeFile) {
            const activeFilePath = activeFile.path;
            const config = {
                target_file: activeFile,
                run_mode: 'DynamicProcessor',
                active_file: activeFile
            };
            if (this.adapterApi) {
                // result = await this.templater.read_and_parse_template(config);
                result = await this.adapterApi.parse_template(config, expression);
                debugLog("parseTemplate() result:", result);
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
        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        let templateFile = this.noteToolbar?.app.vault.getFileByPath(filename);
        if (activeFile) {
            const activeFilePath = activeFile.path;
            const config = { 
                template_file: templateFile,
                target_file: activeFile,
                run_mode: 'DynamicProcessor',
                active_file: activeFile
            };
            if (this.adapterApi) {
                result = await this.adapterApi.read_and_parse_template(config);
                debugLog("parseTemplateFile() result:", result);
            }
        }
        return result;

    }
    
}
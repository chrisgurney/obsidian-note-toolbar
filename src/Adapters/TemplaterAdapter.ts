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
                { parameter: 'outputFile', label: "(Optional) Output filename", description: "Name of the file (without file extension) and folder(s) to create, from the provided template.", type: SettingType.Text, required: false }
            ]
        },
        {
            function: this.parseTemplate,
            label: "Execute Templater command",
            description: "",
            parameters: [
                { parameter: 'expression', label: "Templater command", description: "Templater command to execute.", type: SettingType.Text, required: true },
            ]
        },
        {
            function: this.parseTemplateFile,
            label: "Execute Templater file",
            description: "",
            parameters: [
                { parameter: 'sourceFile', label: "Template file", description: "Executes the contents of the file and returns.", type: SettingType.File, required: true },
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
                displayScriptError(`Error: Could not find note-toolbar-output callout in current note with ID: ${config.outputContainer}`);
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
                    ? await this.createFrom(config.sourceFile, config.outputFile)
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
            try {
                if (templateFile) {
                    await this.adapterApi.append_template_to_active_file(templateFile);
                }
                else {
                    throw new Error("File not found: " + filename);
                }
            }
            catch (error) {
                displayScriptError(error);
            }
        }

    }

    /**
     * Calls create_new_note_from_template.
     * @param filename 
     */
    async createFrom(filename: string, outputFile?: string): Promise<void> {

		if (outputFile && this.noteToolbar?.hasVars(outputFile)) {
            const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
			outputFile = await this.noteToolbar?.replaceVars(outputFile, activeFile, false);
        }

        const { parsedFolder, parsedFilename } = this.parseOutputFile(outputFile);
        let outputFolder = outputFile ? parsedFolder : '';
        let outputFilename = outputFile ? parsedFilename : '';

        if (this.adapterApi) {
            let templateFile = this.noteToolbar?.app.vault.getFileByPath(filename);
            try {
                if (templateFile) {
                    await this.adapterApi.create_new_note_from_template(templateFile, outputFolder, outputFilename);
                }
                else {
                    throw new Error("File not found: " + filename);
                }
            }
            catch (error) {
                displayScriptError(error);
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
     * @returns 
     */
    async parseTemplate(expression: string): Promise<string> {

        let result = '';

        const activeFile = this.noteToolbar?.app.workspace.getActiveFile();
        if (!activeFile) {
            displayScriptError("This expression must be executed from an open note.");
            return "This expression must be executed from an open note.";
        }

        // make sure the opening and closing tags are present, in case they're omitted
        expression = expression.trim();
        if (!expression.startsWith('<%')) expression = '<%' + expression;
        if (!expression.endsWith('%>')) expression += '%>';

        try {
            const config = {
                target_file: activeFile,
                run_mode: 'DynamicProcessor',
                active_file: activeFile
            };
            if (this.adapterApi) {
                result = await this.adapterApi.parse_template(config, expression);
                result = (result === 'undefined') ? '' : result;
            }
        }
        catch (error) {
            displayScriptError(error);
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
        if (!activeFile) {
            displayScriptError("This function must be executed from an open note.");
            return "This function must be executed from an open note.";
        }

        let templateFile = this.noteToolbar?.app.vault.getFileByPath(filename);
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
                    debugLog("parseTemplateFile() result:", result);
                }    
            }
            else {
                throw new Error("File not found: " + filename);
            }
        }
        catch (error) {
            displayScriptError(`Failed to execute script: ${filename}`, error);
        }

        return result;

    }
    
}
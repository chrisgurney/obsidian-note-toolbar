import NoteToolbarPlugin from "main";
import { TFile } from "obsidian";
import { ScriptConfig } from "Settings/NoteToolbarSettings";
import { Adapter, AdapterFunction } from "Types/interfaces";
import { debugLog } from "Utils/Utils";

/**
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/Templater.ts
 */
export default class TemplaterAdapter implements Adapter {

    private plugin: NoteToolbarPlugin;
    private templater: any;

    private functions: AdapterFunction[] = [
        // TODO: description: "Enter the name of the file to create from the provided template."
    ];

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.templater = (plugin.app as any).plugins.plugins["templater-obsidian"].templater;
        // debugLog((plugin.app as any).plugins.plugins["templater-obsidian"]);
        // this.tp = this.templater.current_functions_object;
    }

    getFunctions(): AdapterFunction[] {
        return this.functions;
    }

    async use(config: ScriptConfig): Promise<string | void> {
        let result;
        
        return result;
    }

    async append(filename: string): Promise<void> {

        if (this.templater) {
            let templateFile = this.plugin.app.vault.getFileByPath(filename);
            if (templateFile) {
                await this.templater.append_template_to_active_file(templateFile);
            }
            else {
                debugLog("append: file not found:", filename);
            }
        }

    }

    async createFrom(filename: string): Promise<void> {

        if (this.templater) {
            let templateFile = this.plugin.app.vault.getFileByPath(filename);
            if (templateFile) {
                // TODO? future: support for other parms? template: TFile | string, folder?: TFolder | string, filename?: string, open_new_note = true
                let newFile = await this.templater.create_new_note_from_template(templateFile);
            }
            else {
                debugLog("createFrom: file not found:", filename);
            }
        }

    }

    async parseTemplate(expression: string): Promise<string> {

        // debugger;
        let result = '';
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
            const activeFilePath = activeFile.path;
            const config = {
                target_file: activeFile,
                run_mode: 'DynamicProcessor',
                active_file: activeFile
            };
            debugLog(config);
            if (this.templater) {
                // result = await this.templater.read_and_parse_template(config);
                result = await this.templater.parse_template(config, expression);
                debugLog("parseTemplate:", result);
            }
        }
        return result;

    }

    async parseTemplateFile(filename: string): Promise<string> {

        // debugger;
        let result = '';
        const activeFile = this.plugin.app.workspace.getActiveFile();
        let templateFile = this.plugin.app.vault.getFileByPath(filename);
        if (activeFile) {
            const activeFilePath = activeFile.path;
            const config = { 
                template_file: templateFile,
                target_file: activeFile,
                run_mode: 'DynamicProcessor',
                active_file: activeFile
            };
            debugLog(config);
            if (this.templater) {
                result = await this.templater.read_and_parse_template(config);
                debugLog("parseTemplateFile:", result);
            }
        }
        return result;

    }
    
}
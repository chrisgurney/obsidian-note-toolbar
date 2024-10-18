import NoteToolbarPlugin from "main";
import { TFile } from "obsidian";
import { debugLog } from "Utils/Utils";

/**
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/Templater.ts
 */
export default class TemplaterAdapter {

    plugin: NoteToolbarPlugin;
    templater: any;
    tp: any | undefined;

    constructor(plugin: NoteToolbarPlugin) {
        this.plugin = plugin;
        this.templater = (plugin.app as any).plugins.plugins["templater-obsidian"].templater;
        debugLog((plugin.app as any).plugins.plugins["templater-obsidian"]);
        // this.tp = this.templater.current_functions_object;
    }

    async appendTemplateToActiveFile(filename: string): Promise<void> {

        if (this.templater) {
            let templateFile = this.plugin.app.vault.getFileByPath(filename);
            if (templateFile) {
                await this.templater.append_template_to_active_file(templateFile);
            }
            else {
                debugLog("appendTemplateToActiveFile: file not found:", filename);
            }
        }

    }

    async createNewNoteFromTemplate(filename: string): Promise<void> {

        if (this.templater) {
            let templateFile = this.plugin.app.vault.getFileByPath(filename);
            if (templateFile) {
                // TODO? future: support for other parms? template: TFile | string, folder?: TFolder | string, filename?: string, open_new_note = true
                let newFile = await this.templater.create_new_note_from_template(templateFile);
            }
            else {
                debugLog("createNewNoteFromTemplate: file not found:", filename);
            }
        }

    }

    // TODO? try again some other time, perhaps can use for a dynamic output filename?
    // example: const result = await tp.parseTemplate("tp.file.creation_date()"); insertTextAtCursor(this.app, result);
    // async parseTemplate(templateString: string): Promise<string> {

    //     const activeFile = this.plugin.app.workspace.getActiveFile();
    //     const config = { 
    //         undefined,
    //         activeFile, 
    //         this.templater.RunMode.DynamicProcessor,
    //         activeFile
    //     };
    //     let result = '';
    //     if (this.templater) {
    //         result = await this.templater.parse_template(config, templateString);
    //         debugLog("parseTemplate:", result);
    //     }
    //     return result;

    // }

}
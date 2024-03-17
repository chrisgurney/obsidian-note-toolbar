// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, TAbstractFile, TFolder } from "obsidian";
import { TextInputSuggest } from "./suggest";
import { ToolbarSettings } from "../NoteToolbarSettings";
import NoteToolbarPlugin from "src/main";

export class ToolbarSuggest extends TextInputSuggest<ToolbarSettings> {

    private plugin: NoteToolbarPlugin;

    constructor(app: App, plugin: NoteToolbarPlugin, inputEl: HTMLInputElement | HTMLTextAreaElement) {
        super(app, inputEl);
        this.plugin = plugin;
    }

    getSuggestions(inputStr: string): ToolbarSettings[] {
        const pluginToolbars = this.plugin.settings.toolbars;
        const toolbarSuggestions: ToolbarSettings[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        pluginToolbars.forEach((toolbar: ToolbarSettings) => {
            if (toolbar.name.toLowerCase().contains(lowerCaseInputStr)) {
                toolbarSuggestions.push(toolbar);
            }
        });

        return toolbarSuggestions;
    }

    renderSuggestion(toolbar: ToolbarSettings, el: HTMLElement): void {
        el.setText(toolbar.name);
    }

    selectSuggestion(toolbar: ToolbarSettings): void {
        this.inputEl.value = toolbar.name;
        this.inputEl.trigger("input");
        this.close();
    }
}
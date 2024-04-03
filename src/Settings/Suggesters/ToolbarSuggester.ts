import { AbstractInputSuggest, App } from "obsidian";
import { ToolbarSettings } from "../NoteToolbarSettings";
import NoteToolbarPlugin from "src/main";

export class ToolbarSuggester extends AbstractInputSuggest<ToolbarSettings> {

    private plugin: NoteToolbarPlugin;
    private inputEl: HTMLInputElement;

    constructor(app: App, plugin: NoteToolbarPlugin, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.plugin = plugin;
        this.inputEl = inputEl;
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
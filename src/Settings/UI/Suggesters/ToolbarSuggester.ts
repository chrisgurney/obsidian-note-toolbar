import NoteToolbarPlugin from "main";
import { AbstractInputSuggest } from "obsidian";
import { ToolbarSettings } from "Settings/NoteToolbarSettings";

export default class ToolbarSuggester extends AbstractInputSuggest<ToolbarSettings> {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private inputEl: HTMLInputElement
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): ToolbarSettings[] {
        const pluginToolbars = this.ntb.settings.toolbars;
        const toolbarSuggestions: ToolbarSettings[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        pluginToolbars.forEach((toolbar: ToolbarSettings) => {
            if (toolbar.name !== '' && toolbar.name.toLowerCase().includes(lowerCaseInputStr)) {
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
        this.inputEl.blur();
        this.close();
    }
}
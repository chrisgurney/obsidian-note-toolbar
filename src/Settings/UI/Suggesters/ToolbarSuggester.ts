import NoteToolbarPlugin from "main";
import { AbstractInputSuggest } from "obsidian";
import { ToolbarSettings } from "Settings/NoteToolbarSettings";

export default class ToolbarSuggester extends AbstractInputSuggest<ToolbarSettings> {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private inputEl: HTMLInputElement,
        private filter?: (toolbar: ToolbarSettings) => boolean
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): ToolbarSettings[] {
        const lowerCaseInputStr = inputStr.toLowerCase();

        return this.ntb.settings.toolbars.filter((toolbar) => {
            return (
                toolbar.name !== '' &&
                toolbar.name.toLowerCase().includes(lowerCaseInputStr) &&
                (!this.filter || this.filter(toolbar))
            );
        });
    }

    renderSuggestion(toolbar: ToolbarSettings, el: HTMLElement): void {
		const containerEl = el.createDiv();
		containerEl.addClass('note-toolbar-tbar-suggestion-container');
        this.ntb.settingsUtils.renderToolbarName(toolbar, containerEl);
    }

    selectSuggestion(toolbar: ToolbarSettings): void {
        this.inputEl.value = toolbar.name;
        this.inputEl.trigger("input");
        this.inputEl.blur();
        this.close();
    }
}
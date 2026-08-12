import NoteToolbarPlugin from "main";
import { AbstractInputSuggest } from "obsidian";
import { NONE_TOOLBAR, NONE_TOOLBAR_ID, ToolbarSettings } from "Settings/NoteToolbarSettings";

export default class ToolbarSuggester extends AbstractInputSuggest<ToolbarSettings> {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private inputEl: HTMLInputElement,
        private showNone = false,
        private filter?: (toolbar: ToolbarSettings) => boolean,
        private callback?: (toolbar: ToolbarSettings) => Promise<void>
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): ToolbarSettings[] {
        const lowerCaseInputStr = inputStr.toLowerCase();

        const toolbars = [...this.ntb.settings.toolbars];
        if (this.showNone) {
            const noneToolbar = { ...NONE_TOOLBAR };
            toolbars.push(noneToolbar);
        }

        return toolbars.filter((toolbar) => {
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

        const isSpecialToolbar = [NONE_TOOLBAR_ID].includes(toolbar.uuid);
        if (isSpecialToolbar) {
            containerEl.addClass('cm-em');
            return;
        }
    }

    selectSuggestion(toolbar: ToolbarSettings): void {
        this.inputEl.value = toolbar.name;
        if (this.callback) {
            void this.callback(toolbar);
        }
        else {
            this.inputEl.trigger("input");
            this.inputEl.blur();
        }
        this.close();
    }

}
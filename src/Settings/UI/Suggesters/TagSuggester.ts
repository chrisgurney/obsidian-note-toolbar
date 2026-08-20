import NoteToolbarPlugin from "main";
import { AbstractInputSuggest } from "obsidian";

export default class TagSuggester extends AbstractInputSuggest<string> {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private inputEl: HTMLInputElement,
        private classes?: string[]
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): Array<string> {

        const allTags = this.ntb.api.getTags();
        const tags: string[] = [];

        for (const tag of allTags) {
            if (tag.toLowerCase().includes(inputStr.toLowerCase())) {
                tags.push(tag);
            }
        }

        return tags;
    }

    renderSuggestion(tag: string, el: HTMLElement): void {
        if (this.classes) el.addClasses(this.classes);
        el.setText(tag);
    }

    selectSuggestion(tag: string): void {
        this.inputEl.value = tag;
        this.inputEl.trigger("input");
        this.inputEl.blur();
        this.close();
    }

}
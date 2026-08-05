import { AbstractInputSuggest, App } from "obsidian";

export default class TagSuggester extends AbstractInputSuggest<string> {

    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    getSuggestions(inputStr: string): Array<string> {

        const allTags = this.app.metadataCache.getTags();
        const tags: string[] = [];

        for (const tag of Object.keys(allTags)) {
            if (tag.toLowerCase().includes(inputStr.toLowerCase())) {
                tags.push(tag);
            }
        }

        return tags;
    }

    renderSuggestion(tag: string, el: HTMLElement): void {
        el.setText(tag);
    }

    selectSuggestion(tag: string): void {
        this.inputEl.value = tag;
        this.inputEl.trigger("input");
        this.inputEl.blur();
        this.close();
    }

}
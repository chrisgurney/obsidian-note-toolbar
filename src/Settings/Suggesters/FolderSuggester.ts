import { AbstractInputSuggest, App, TAbstractFile, TFolder } from "obsidian";

module FolderSuggester {
    export type Pattern = {
        pattern: string,
        desc: string
    }
}

export class FolderSuggester extends AbstractInputSuggest<string> {

    private inputEl: HTMLInputElement;

    private PATTERN_ALL_FILES: FolderSuggester.Pattern = { pattern: '*', desc: 'all folders' };
    private PATTERN_ROOT_ONLY: FolderSuggester.Pattern = { pattern: '/', desc: 'root folder only' };

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    getSuggestions(inputStr: string): Array<string> {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: string[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        folders.push(this.PATTERN_ALL_FILES.pattern);
        // no need to add PATTERN_ROOT as it's included below

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (folder instanceof TFolder && folder.path.toLowerCase().contains(lowerCaseInputStr)) {
                folders.push(folder.path);
            }
        });

        return folders;
    }

    renderSuggestion(folder: string, el: HTMLElement): void {
        if (folder === this.PATTERN_ALL_FILES.pattern) {
            this.renderPattern(el, this.PATTERN_ALL_FILES);
        } 
        else if (folder === this.PATTERN_ROOT_ONLY.pattern) {
            this.renderPattern(el, this.PATTERN_ROOT_ONLY);
        }
        else {
            el.setText(folder);
        }
    }

    selectSuggestion(folder: string): void {
        this.inputEl.value = folder;
        this.inputEl.trigger("input");
        this.close();
    }

    renderPattern(el: HTMLElement, suggestion: FolderSuggester.Pattern) {
        el.addClass('note-toolbar-setting-folder-suggestion-item-muted');
        el.createSpan().setText(suggestion.pattern);
        el.createSpan().setText(suggestion.desc);
    }

}
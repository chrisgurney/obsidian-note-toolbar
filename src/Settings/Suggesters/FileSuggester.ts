import { AbstractInputSuggest, App, TAbstractFile, TFile } from "obsidian";

export class FileSuggester extends AbstractInputSuggest<TAbstractFile> {

    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    getSuggestions(inputStr: string): TAbstractFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        let files: TAbstractFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        files = abstractFiles.filter((file: TAbstractFile) =>
            file instanceof TFile && file.path.toLowerCase().includes(lowerCaseInputStr)
        );

        return files;
    }

    renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TAbstractFile): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.close();
    }
}
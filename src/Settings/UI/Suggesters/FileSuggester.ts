import { AbstractInputSuggest, App, TAbstractFile, TFile, TFolder } from "obsidian";

export class FileSuggester extends AbstractInputSuggest<TAbstractFile> {

    private inputEl: HTMLInputElement;
    private showFilesOnly: boolean;

    constructor(app: App, inputEl: HTMLInputElement, showFilesOnly: boolean = false) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.showFilesOnly = showFilesOnly;
    }

    getSuggestions(inputStr: string): TAbstractFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        let files: TAbstractFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        files = abstractFiles.filter((file: TAbstractFile) =>
            (file instanceof TFile || (!this.showFilesOnly && file instanceof TFolder)) && 
            file.path.toLowerCase().includes(lowerCaseInputStr)
        );

        return files;
    }

    renderSuggestion(file: TAbstractFile, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TAbstractFile): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.inputEl.blur();
        this.close();
    }
}
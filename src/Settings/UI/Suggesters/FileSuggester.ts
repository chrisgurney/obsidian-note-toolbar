import { AbstractInputSuggest, App, TAbstractFile, TFile, TFolder } from "obsidian";

export class FileSuggester extends AbstractInputSuggest<TAbstractFile> {

    private inputEl: HTMLInputElement;
    private showFilesOnly: boolean;
    private fileExtension: string | undefined;

    constructor(app: App, inputEl: HTMLInputElement, showFilesOnly: boolean = false, fileExtension?: string) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.showFilesOnly = showFilesOnly;
        this.fileExtension = fileExtension;
    }

    getSuggestions(inputStr: string): TAbstractFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        let files: TAbstractFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        files = abstractFiles.filter((file: TAbstractFile) => {
            const isFile = file instanceof TFile;
            let matchesInput = file.path.toLowerCase().includes(lowerCaseInputStr);
            if (!matchesInput) return false;
            if (this.showFilesOnly && !isFile) return false;
            if (this.fileExtension && isFile && !file.path.endsWith(this.fileExtension)) return false;
            return true;
        });

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
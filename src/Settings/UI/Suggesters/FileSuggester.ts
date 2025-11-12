import NoteToolbarPlugin from "main";
import { AbstractInputSuggest, TAbstractFile, TFile } from "obsidian";
import { LocalVar } from "Settings/NoteToolbarSettings";

export default class FileSuggester extends AbstractInputSuggest<TAbstractFile> {

    constructor(
        private ntb: NoteToolbarPlugin,
        private inputEl: HTMLInputElement, 
        private showFilesOnly: boolean = false, 
        private fileExtension?: string, 
        private folderPath?: string
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): TAbstractFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        
        let files: TAbstractFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();
        const recentFiles = JSON.parse(this.ntb.app.loadLocalStorage(LocalVar.RecentFiles) || '[]');

        files = abstractFiles.filter((file: TAbstractFile) => {
            const isFile = file instanceof TFile;
            const lowerCaseFilePath = file.path.toLowerCase();
            let matchesInput = lowerCaseFilePath.includes(lowerCaseInputStr);
            if (!matchesInput) return false;
            if (this.showFilesOnly && !isFile) return false;
            if (this.fileExtension && isFile && !lowerCaseFilePath.endsWith(this.fileExtension.toLowerCase())) return false;
            const lowerCaseFolder = this.folderPath?.toLowerCase();
            if (lowerCaseFolder && !lowerCaseFilePath.startsWith(lowerCaseFolder + '/')) return false;
            return true;
        })
        // prioritize recent files
        .sort((a, b) => {
            const ai = recentFiles.indexOf(a.path);
            const bi = recentFiles.indexOf(b.path);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi; // lower index = more recent
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
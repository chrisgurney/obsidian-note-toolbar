import NoteToolbarPlugin from "main";
import { AbstractInputSuggest, App, TAbstractFile, TFile, TFolder } from "obsidian";
import { debugLog } from "Utils/Utils";

export class FileSuggester extends AbstractInputSuggest<TAbstractFile> {

    constructor(
        private plugin: NoteToolbarPlugin,
        private inputEl: HTMLInputElement, 
        private showFilesOnly: boolean = false, 
        private fileExtension?: string, 
        private folderPath?: string
    ) {
        super(plugin.app, inputEl);
    }

    getSuggestions(inputStr: string): TAbstractFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const recentFilePaths = new Set(this.plugin.settings.recentFiles);
        
        let files: TAbstractFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

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
            const aRecent = recentFilePaths.has(a.path) ? 0 : 1;
            const bRecent = recentFilePaths.has(b.path) ? 0 : 1;
            return aRecent - bRecent;
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
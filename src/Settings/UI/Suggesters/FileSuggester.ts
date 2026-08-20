import NoteToolbarPlugin from "main";
import { AbstractInputSuggest, TAbstractFile, TFile } from "obsidian";
import { LocalVar } from "Settings/NoteToolbarSettings";

export default class FileSuggester extends AbstractInputSuggest<TAbstractFile> {

    constructor(
        private ntb: NoteToolbarPlugin,
        private inputEl: HTMLInputElement, 
        private options?: {
            showFilesOnly: boolean, 
            showFileNamesOnly: boolean,
            fileExtension?: string, 
            inFolderPath?: string,
        },
        private classes?: string[],
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): TAbstractFile[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        
        let files: TAbstractFile[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();
        const recentFiles = JSON.parse(this.ntb.app.loadLocalStorage(LocalVar.RecentFiles) as string || '[]') as string[];

        files = abstractFiles.filter((file: TAbstractFile) => {
            const isFile = file instanceof TFile;
            const lowerCaseFilePath = file.path.toLowerCase();
            const matchesInput = lowerCaseFilePath.includes(lowerCaseInputStr);
            if (!matchesInput) return false;
            if (this.options?.showFilesOnly && !isFile) return false;
            if (this.options?.fileExtension && isFile && !lowerCaseFilePath.endsWith(this.options?.fileExtension.toLowerCase())) return false;
            const lowerCaseFolder = this.options?.inFolderPath?.toLowerCase();
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
        if (this.classes) el.addClasses(this.classes);
        el.setText(this.getDisplayName(file));
    }

    selectSuggestion(file: TAbstractFile): void {
        this.inputEl.value = this.getDisplayName(file);
        this.inputEl.trigger("input");
        this.inputEl.blur();
        this.close();
    }

    private getDisplayName(file: TAbstractFile): string {
        return this.options?.showFileNamesOnly ? file.name : file.path;
    }
}
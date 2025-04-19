import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { NtbSuggester } from "./NtbSuggester";
import { NtbPrompt } from "./NtbPrompt";
import { INoteToolbarApi, NtbFileSuggesterOptions, NtbModalOptions, NtbPromptOptions, NtbSuggesterOptions } from "./INoteToolbarApi";
import { NtbModal } from "./NtbModal";
import { TAbstractFile, TFile, TFolder } from "obsidian";
import { Toolbar } from "./Toolbar";
import { Item } from "./Item";
import { debugLog } from "Utils/Utils";
import { t } from "Settings/NoteToolbarSettings";

export type Callback = (arg: string) => void;

export class NoteToolbarApi<T> implements INoteToolbarApi<T> {

    constructor(private plugin: NoteToolbarPlugin) {
    }

    // async testCallback(buttonId: string, callback: Callback) {
    //     return await testCallback(this.plugin, buttonId, callback);
    // }

    /**
     * Gets the clipboard value. 
     * 
     * @see INoteToolbarApi.clipboard
     */
    async clipboard(): Promise<string | null> {
        return await navigator.clipboard.readText();
    }

    /**
     * Shows a file suggester modal and waits for the user's selection. 
     * 
     * @see INoteToolbarApi.fileSuggester
     */
    async fileSuggester<T>(
        options?: NtbFileSuggesterOptions
    ): Promise<TAbstractFile> {

        const abstractFiles = this.plugin.app.vault.getAllLoadedFiles();
        let files: TAbstractFile[] = [];
        files = abstractFiles.filter((file: TAbstractFile) => {
            if (options?.filesonly && !(file instanceof TFile)) return false;
            if (options?.foldersonly && !(file instanceof TFolder)) return false;
            return true;
        });

        const suggester = new NtbSuggester(this.plugin, files.map(f => f.path), files, options);

        const promise = new Promise((resolve: (value: TAbstractFile) => void, reject: (reason?: Error) => void) => 
            suggester.openAndGetValue(resolve, reject)
        );

        try {
            return await promise;
        } 
        catch (error) {
            return null as unknown as TAbstractFile;
        }

    };

    /**
     * Gets the active item from the currently displayed toolbar.
     * 
     * @see INoteToolbarApi.getActiveItem
     */
    getActiveItem(): Item | undefined {
        const activeItemId = this.plugin.getActiveItemId();
        if (!activeItemId) return;
        const activeItem = this.plugin.settingsManager.getToolbarItemById(activeItemId);
        return (activeItem) ? new Item(this.plugin, activeItem) : undefined;
    }

    /**
     * Gets an item by its ID, if it exists.
     * 
     * @see INoteToolbarApi.getItem
     */
    getItem(id: string): Item | undefined {
        const item = this.plugin.settingsManager.getToolbarItemById(id);
        return (item) ? new Item(this.plugin, item) : undefined;
    }

    /**
     * Gets the value of the given property in the active note.
     * 
     * @see INoteToolbarApi.getProperty
     */
    getProperty(property: string): string | undefined {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
            const frontmatter = activeFile ? this.plugin.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
            return frontmatter ? frontmatter[property] : undefined;
        }
        return undefined;
    }

    /**
     * Gets all toolbars (as {@link Toolbar} objects).
     * 
     * @see INoteToolbarApi.getToolbars
     */
    getToolbars(): Toolbar[] {
        return this.plugin.settings.toolbars.map(toolbar => new Toolbar(this.plugin, toolbar));
    }

    /**
     * Shows a modal containing the provided content.
     * 
     * @see INoteToolbarApi.modal
     */
    async modal(content: string | TFile, options?: NtbModalOptions): Promise<void> {
        const modal = new NtbModal(this.plugin, content, options);
        if (content instanceof TFile && options?.editable) await modal.displayEditor();
        else await modal.displayMarkdown();
    }

    /**
     * Shows the prompt modal and waits for the user's input.
     * 
     * @see INoteToolbarApi.prompt
     * @see Adapted from [Templater](https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts)
     */
    async prompt(options?: NtbPromptOptions): Promise<string | null> {

        const prompt = new NtbPrompt(this.plugin, options);

        const promise = new Promise((resolve: (value: string) => void, reject: (reason?: Error) => void) => 
            prompt.openAndGetValue(resolve, reject)
        );

        try {
            return await promise;
        }
        catch (error) {
            return null;
        }

    };

    /**
     * Shows a suggester modal and waits for the user's selection. 
     * 
     * @see INoteToolbarApi.suggester
     * @see Adapted from [Templater](https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts)
     */
    async suggester<T>(
        values: string[] | ((value: T) => string), keys?: T[], options?: NtbSuggesterOptions
    ): Promise<T> {

        const suggester = new NtbSuggester(this.plugin, values, keys, options);

        const promise = new Promise((resolve: (value: T) => void, reject: (reason?: Error) => void) => 
            suggester.openAndGetValue(resolve, reject)
        );

        try {
            return await promise;
        } 
        catch (error) {
            return null as unknown as T;
        }

    };

   /**
     * The i18next T function, scoped to Note Toolbar's localized strings.
     * 
     * @see INoteToolbarApi.t
     */
    t: string = t;

}
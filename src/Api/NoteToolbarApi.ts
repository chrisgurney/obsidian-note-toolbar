import NoteToolbarPlugin from "main";
import { testCallback } from "Api/TestCallback";
import { NtbSuggester } from "./NtbSuggester";
import { NtbPrompt } from "./NtbPrompt";
import { INoteToolbarApi, NtbFileSuggesterOptions, NtbMenuItem, NtbMenuOptions, NtbModalOptions, NtbPromptOptions, NtbSuggesterOptions } from "./INoteToolbarApi";
import { NtbModal } from "./NtbModal";
import { Menu, MenuItem, Modal, Notice, TAbstractFile, TFile, TFolder } from "obsidian";
import { Toolbar } from "./Toolbar";
import { Item } from "./Item";
import { LocalVar, t } from "Settings/NoteToolbarSettings";
import { putFocusInMenu } from "Utils/Utils";

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
        const recentFiles = JSON.parse(this.plugin.app.loadLocalStorage(LocalVar.RecentFiles) || '[]');

        let files: TAbstractFile[] = [];
        files = abstractFiles.filter((file: TAbstractFile) => {
            if (options?.filesonly && !(file instanceof TFile)) return false;
            if (options?.foldersonly && !(file instanceof TFolder)) return false;
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

        // strip out extension from markdown files
        const filePaths = files.map(f =>
            (f instanceof TFile && ['md', 'markdown'].includes(f.extension.toLowerCase()))
                ? f.path.replace(/\.(md|markdown)$/i, '')
                : f.path
        );

        options = {
            limit: 9,
            placeholder: 
                options?.filesonly ? t('api.ui.file-suggester-placeholder_file') :
                    options?.foldersonly ? t('api.ui.file-suggester-placeholder_folder') : t('api.ui.file-suggester-placeholder'), 
            ...options,
            rendermd: false
        }

        const suggester = new NtbSuggester(this.plugin, filePaths, files, options);

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
     * Shows a menu with the provided items.
     * 
     * @see INoteToolbarApi.menu
     */
    async menu(items: NtbMenuItem[], options?: NtbMenuOptions): Promise<void> {

        const menu = new Menu();
        const requiredProps: (keyof NtbMenuItem)[] = ['type', 'value'];
        items.map((item: NtbMenuItem) => {
            const missingProp = requiredProps.find(p => !item[p]);
            if (missingProp) new Notice(t('api.ui.error-missing-property', {property: item.type}));
            menu.addItem((menuItem: MenuItem) => {
                menuItem
                    .setTitle(item.label)
                    .setIcon(item.icon ? item.icon : null)
                    .onClick(async () => {
                        switch (item.type) {
                            case 'command':
                                await this.plugin.handleLinkCommand(item.value);
                                break;
                            case 'file': {
                                const activeFile = this.plugin.app.workspace.getActiveFile();
                                const activeFilePath = activeFile ? activeFile.path : '';
                                this.plugin.app.workspace.openLinkText(item.value, activeFilePath);
                                break;
                            }
                            case 'uri':
                                await this.plugin.handleLinkUri(item.value);
                                break;
                            default:
                                new Notice(t('api.ui.error-unsupported-property', {property: item.type}));
                                break;
                        }
                    });
            });
        });

        menu.dom.addClass('note-toolbar-menu');

		// apply custom classes to the sub-menu by getting the note's toolbar 
		const activeToolbar = this.plugin.getCurrentToolbar();
		if (activeToolbar && activeToolbar.customClasses) menu.dom.addClasses([...activeToolbar.customClasses.split(' ')]);
        if (options?.class) menu.dom.addClasses([...options.class.split(' ')]);

        // this.plugin.debug('lastClickedEl', this.plugin.lastClickedEl);
        this.plugin.showMenuAtElement(menu, this.plugin.lastClickedEl);

        if (options?.focusInMenu) putFocusInMenu();

    }

    /**
     * Shows a modal containing the provided content.
     * 
     * @see INoteToolbarApi.modal
     */
    async modal(content: string | TFile, options?: NtbModalOptions): Promise<Modal> {
        const modal = new NtbModal(this.plugin, content, options);
        if (options?.editable && content instanceof TFile) await modal.displayEditor();
        else if (options?.webpage && typeof content === 'string') await modal.displayWebpage();
        else await modal.displayMarkdown();
        return modal as Modal;
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
     * Sets the given property's value in the active note. 
     * 
     * @see INoteToolbarApi.setProperty
     */
    async setProperty(property: string, value: any) {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
            await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                frontmatter[property] = value;
            });
        }
    }

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
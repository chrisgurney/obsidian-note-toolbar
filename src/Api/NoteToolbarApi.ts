import NoteToolbarPlugin from "main";
// import { testCallback } from "Api/TestCallback";
import * as Obsidian from "obsidian";
import { App, ItemView, MarkdownView, Menu, MenuItem, Modal, Notice, TAbstractFile, TFile, TFolder } from "obsidian";
import { LocalVar, PositionType, t } from "Settings/NoteToolbarSettings";
import { putFocusInMenu } from "Utils/Utils";
import INoteToolbarApi, { NtbFileSuggesterOptions, NtbMenuItem, NtbMenuOptions, NtbModalOptions, NtbPromptOptions, NtbSuggesterOptions, NtbToolbarOptions } from "./INoteToolbarApi";
import Item from "./Item";
import NtbModal from "./NtbModal";
import NtbPrompt from "./NtbPrompt";
import NtbSuggester from "./NtbSuggester";
import Toolbar from "./Toolbar";

export type Callback = (arg: string) => void;

export default class NoteToolbarApi<T> implements INoteToolbarApi<T> {

    constructor(private ntb: NoteToolbarPlugin) {
        this.app = ntb.app;
    }

    // async testCallback(buttonId: string, callback: Callback) {
    //     return await testCallback(this.plugin, buttonId, callback);
    // }

    /**
     * The Obsidian app instance.
     * 
     * @see INoteToolbarApi.app
     */
    readonly app: App;

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

        const abstractFiles = this.ntb.app.vault.getAllLoadedFiles();
        const recentFiles = JSON.parse(this.ntb.app.loadLocalStorage(LocalVar.RecentFiles) || '[]');

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

        const suggester = new NtbSuggester(this.ntb, filePaths, files, options);

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
        const activeItemId = this.ntb.el.getActiveItemId();
        if (!activeItemId) return;
        const activeItem = this.ntb.settingsManager.getToolbarItemById(activeItemId);
        return (activeItem) ? new Item(this.ntb, activeItem) : undefined;
    }

    /**
     * Gets an item by its ID, if it exists.
     * 
     * @see INoteToolbarApi.getItem
     */
    getItem(id: string): Item | undefined {
        const item = this.ntb.settingsManager.getToolbarItemById(id);
        return (item) ? new Item(this.ntb, item) : undefined;
    }

    /**
     * Gets the value of the given property in the active note.
     * 
     * @see INoteToolbarApi.getProperty
     */
    getProperty(property: string): string | undefined {
        const activeFile = this.ntb.app.workspace.getActiveFile();
        if (activeFile) {
            const frontmatter = activeFile ? this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter : undefined;
            return frontmatter ? frontmatter[property] : undefined;
        }
        return undefined;
    }

    /**
     * Gets the selected text, or the word at the cursor position.
     * 
     * @see INoteToolbarApi.getSelection
     */
    getSelection(): string {
        return this.ntb.utils.getSelection(false);
    }

    /**
     * Gets all toolbars (as {@link Toolbar} objects).
     * 
     * @see INoteToolbarApi.getToolbars
     */
    getToolbars(): Toolbar[] {
        return this.ntb.settings.toolbars.map(toolbar => new Toolbar(this.ntb, toolbar));
    }

    /**
     * Shows a menu with the provided items.
     * 
     * @see INoteToolbarApi.menu
     */
    async menu(toolbarOrItems: string | NtbMenuItem[], options?: NtbMenuOptions): Promise<void> {

        let menu = new Menu();
        const requiredProps: (keyof NtbMenuItem)[] = ['type', 'value'];
        if (typeof toolbarOrItems === 'string') {
            const toolbar = this.ntb.settingsManager.getToolbar(toolbarOrItems);
            const activeFile = this.ntb.app.workspace.getActiveFile();
            if (toolbar) {
                menu = await this.ntb.render.renderAsMenu(toolbar, activeFile);
            }
            else {
                new Notice(t('api.msg.toolbar-not-found', {toolbar: toolbarOrItems})).containerEl.addClass('mod-warning');
                return;
            }
        }
        else {
            toolbarOrItems.map((item: NtbMenuItem) => {
                const missingProp = requiredProps.find(p => !item[p]);
                if (missingProp) new Notice(t('api.ui.error-missing-property', {property: item.type})).containerEl.addClass('mod-warning');
                menu.addItem((menuItem: MenuItem) => {
                    menuItem
                        .setTitle(item.label)
                        .setIcon(item.icon ? item.icon : null)
                        .onClick(async () => {
                            switch (item.type) {
                                case 'command':
                                    await this.ntb.items.handleLinkCommand(item.value);
                                    break;
                                case 'file': {
                                    const activeFile = this.ntb.app.workspace.getActiveFile();
                                    const activeFilePath = activeFile ? activeFile.path : '';
                                    this.ntb.app.workspace.openLinkText(item.value, activeFilePath);
                                    break;
                                }
                                case 'uri':
                                    await this.ntb.items.handleLinkUri(item.value);
                                    break;
                                default:
                                    new Notice(t('api.ui.error-unsupported-property', {property: item.type})).containerEl.addClass('mod-warning');
                                    break;
                            }
                        });
                    // add an ID if provided, for styling purposes
                    if (item.id) menuItem.dom.id = item.id;
                });
            });
        }

        menu.dom.addClass('note-toolbar-menu');

        // add an ID if provided, for styling purposes
        if (options?.id) menu.dom.id = options.id;

		// apply custom classes to the sub-menu by getting the note's toolbar 
		const activeToolbar = this.ntb.settingsManager.getCurrentToolbar();
		if (activeToolbar && activeToolbar.customClasses) menu.dom.addClasses([...activeToolbar.customClasses.split(' ')]);
        if (options?.class) menu.dom.addClasses([...options.class.split(' ')]);

        // show at text cursor, with a fallback to the mouse position
        if (options?.position === 'cursor') {
            const position = this.ntb.utils.getPosition('cursor');
            if (position) this.ntb.render.showMenuAtPosition(menu, { x: position.left, y: position.top });
        }
        // default position is 'toolbar'
        else {
            if (this.ntb.render.lastClickedPos) {
                this.ntb.render.showMenuAtPosition(menu, 
                    { x: this.ntb.render.lastClickedPos.left, y: this.ntb.render.lastClickedPos.bottom, overlap: true, left: false }
                );
            }
            else {
                // TODO: display an error
                this.ntb.debug('⚠️ ntb.menu: Not opening window - No toolbar position available.');
            }
        }

        if (options?.focusInMenu) putFocusInMenu();

    }

    /**
     * Shows a modal containing the provided content.
     * 
     * @see INoteToolbarApi.modal
     */
    async modal(content: string | TFile, options?: NtbModalOptions): Promise<Modal> {
        const modal = new NtbModal(this.ntb, content, options);
        if (options?.editable && content instanceof TFile) await modal.displayEditor();
        else if (options?.webpage && typeof content === 'string') await modal.displayWebpage();
        else await modal.displayMarkdown();
        return modal as Modal;
    }

    /**
     * Reference to the Obsidian API module for accessing Obsidian classes and utilities.
     * 
     * @see INoteToolbarApi.o;
     */
    readonly o = Obsidian;

    /**
     * Shows the prompt modal and waits for the user's input.
     * 
     * @see INoteToolbarApi.prompt
     * @see Adapted from [Templater](https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/InternalModuleSystem.ts)
     */
    async prompt(options?: NtbPromptOptions): Promise<string | null> {

        const prompt = new NtbPrompt(this.ntb, options);

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

    async replaceToolbar(toolbarId: string): Promise<void> {
        // TODO: flag to replace the text toolbar (vs the note's toolbar)
        // TODO: if ID not set, revert to original toolbar
        const activeToolbar = this.ntb.settingsManager.getCurrentToolbar();
    }

    /**
     * Sets the given property's value in the active note. 
     * 
     * @see INoteToolbarApi.setProperty
     */
    async setProperty(property: string, value: any) {
        const activeFile = this.ntb.app.workspace.getActiveFile();
        if (activeFile) {
            await this.ntb.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                frontmatter[property] = value;
            });
        }
    }

    /**
     * Replaces the selected text with the provided string, or the word at the cursor position.
     * 
     * @see INoteToolbarApi.setSelection
     */
    setSelection(replacement: string) {
        const editor = this.ntb.app.workspace.activeEditor?.editor;
        if (!editor) return;
        
        const selection = editor.getSelection();

        if (selection) {
            editor.replaceSelection(replacement);
        } else {
            const wordRange = editor.wordAt(editor.getCursor());
            if (wordRange) editor.replaceRange(replacement, wordRange.from, wordRange.to);
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

        const suggester = new NtbSuggester(this.ntb, values, keys, options);

        const promise = new Promise((resolve: (value: T) => void, reject: (reason?: Error) => void) => 
            suggester.openAndGetValue(resolve, reject)
        );

        try {
            return await promise;
        } 
        catch (error) {
            return null as unknown as T;
        }

    }

   /**
     * The i18next T function, scoped to Note Toolbar's localized strings.
     * 
     * @see INoteToolbarApi.t
     */
    t: string = t;

    /**
     * Shows a toolbar by its name or ID.
     * 
     * @see INoteToolbarApi.toolbar
     */
    async toolbar(toolbarNameOrId: string, options?: NtbToolbarOptions): Promise<void> {

        const toolbar = this.ntb.settingsManager.getToolbar(toolbarNameOrId);
        if (!toolbar) {
            new Notice(t('api.msg.toolbar-not-found', {toolbar: toolbarNameOrId})).containerEl.addClass('mod-warning');
            return;
        }

        // position option; defaults to 'toolbar' as scripts are typically executed from clicked items
        const showAtPosition = this.ntb.utils.getPosition(options?.position ?? 'toolbar');

        await this.ntb.render.renderFloatingToolbar(toolbar, showAtPosition, PositionType.Floating);

        // apply custom classes
        if (options?.class) this.ntb.render.floatingToolbarEl?.addClasses([...options.class.split(' ')]);

        // focus is required, or the toolbar doesn't stay up
        await this.ntb.commands.focus(true);

        // this.ntb.debug('ntb.toolbar() is toolbar focussed?', this.ntb.render.isFloatingToolbarFocussed());

    }

}
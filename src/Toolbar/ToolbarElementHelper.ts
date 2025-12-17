import NoteToolbarPlugin from "main";
import { ItemView, MarkdownView } from "obsidian";
import { LocalVar } from "Settings/NoteToolbarSettings";

/**
 * Provides utilities to access toolbar DOM elements.
 */
export default class ToolbarElementHelper {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

	/**
	 * Gets the active (last activated) item's ID.
	 * @returns last activated toolbar item ID, or null if it can't be found.
	 */
	getActiveItemId(): string | null {
		return this.ntb.app.loadLocalStorage(LocalVar.ActiveItem);
	}

    /**
     * Gets all toolbar elements in the current or provided view.
     * @returns all toolbar elements in the current view, or an empty NodeList if none found.
     */
    getAllToolbarEl(view?: ItemView): NodeListOf<HTMLElement> {
        let toolbarViewEl = view ? view.containerEl : this.ntb.app.workspace.getActiveViewOfType(ItemView)?.containerEl as HTMLElement;
        toolbarViewEl = toolbarViewEl?.closest('.modal-container .note-toolbar-ui') ?? toolbarViewEl;
        return toolbarViewEl?.querySelectorAll('.cg-note-toolbar-container') as NodeListOf<HTMLElement>;
    }

    /**
     * Gets the Properties container for the active or provided view.
     * @param view optional MarkdownView to find the Properties container for; otherwise uses the active view.
     * @returns HTMLElement or null, if it doesn't exist.
     */
    getPropsEl(view?: MarkdownView): HTMLElement | null {
        const currentView = view ?? this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
        if (!currentView) return null;
        const currentMode = currentView.getMode();
        const currentViewEl = currentView.containerEl as HTMLElement;
        // get the props container based on view mode; fix for toolbar not showing below props in reading mode, in notes with an embed (#392)
        const propertiesContainer = currentViewEl?.querySelector(`.markdown-${currentMode === 'preview' ? 'reading' : 'source'}-view .metadata-container`) as HTMLElement;
        // fix for toolbar rendering in Make.md frames, causing unpredictable behavior (#151)
        if (this.ntb.adapters.hasPlugin('make-md') && propertiesContainer?.closest('.mk-frame-edit')) {
            return null;
        }
        return propertiesContainer;
    }

    /**
     * Gets the note-toolbar-output callout container in the current view, matching the provided metadata string.
     * @example
     * > [!note-toolbar-output|META]
     * @param calloutMeta string to match
     * @returns HTMLElement or null, if it doesn't exist.
     */
    getOutputEl(calloutMeta: string): HTMLElement | null {
        const currentViewEl = this.ntb.app.workspace.getActiveViewOfType(MarkdownView)?.leaf.containerEl as HTMLElement | null;
        const containerEl = currentViewEl?.querySelector('.callout[data-callout="note-toolbar-output"][data-callout-metadata*="' + calloutMeta + '"]') as HTMLElement;
        // this.debug("getScriptOutputEl:", containerEl);
        return containerEl;
    }

    /**
     * Get the toolbar element, in the current view.
     * @param view optional ItemView to find the toolbar container for; otherwise uses the active view.
     * @param isTextToolbar set to true if this is for the text toolbar.
     * @returns HTMLElement or null, if it doesn't exist.
     */
    getToolbarEl(view?: ItemView, isTextToolbar: boolean = false): HTMLElement | null {
        if (isTextToolbar) {
            return activeDocument.querySelector('.cg-note-toolbar-container[data-tbar-position="text"]') as HTMLElement;
        }
        else {
            var toolbarEl: HTMLElement | null = null;
            const toolbarView = view ? view : this.ntb.app.workspace.getActiveViewOfType(ItemView);
            const toolbarViewEl = toolbarView?.containerEl as HTMLElement;
            if (toolbarViewEl) {
                toolbarEl = toolbarViewEl?.querySelector('.cg-note-toolbar-container');
            }
            if (!toolbarEl) {
                // check for floating buttons
                toolbarEl = activeDocument.querySelector('.cg-note-toolbar-container[data-tbar-position*="fab"]');
            }
            return toolbarEl;
        }
    }

    /**
     * Get the toolbar element's <ul> element, in the current view.
     * @param isTextToolbar set to true if this is for the text toolbar.
     * @returns HTMLElement or null, if it doesn't exist.
     */
    getToolbarListEl(isTextToolbar: boolean = false): HTMLElement | null {
        const toolbarEl = this.getToolbarEl(undefined, isTextToolbar);
        return toolbarEl?.querySelector('.callout-content > ul') as HTMLElement;
    }

    /**
     * Get the floating action button, if it exists.
     * @returns HTMLElement or null, if it doesn't exist.
     */
    getToolbarFabEl(): HTMLElement | null {
        let existingToolbarFabEl = activeDocument.querySelector('.cg-note-toolbar-fab-container') as HTMLElement;
        return existingToolbarFabEl;
    }

}
import { App, Component, FuzzyMatch, FuzzySuggestModal, MarkdownRenderer } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";

/**
 * Provides a SuggesterModal that can be accessed from the Note Toolbar API.
 * 
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/SuggesterModal.ts
 */
export class SuggesterModal<T> extends FuzzySuggestModal<T> {
    private resolve: (value: T) => void;
    private reject: (reason?: Error) => void;
    private submitted = false;

    /**
     * @param text_items Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation.
     * @param items Array containing the values of each item in the correct order.
     * @param placeholder Placeholder string of the prompt.
     * @param limit Limit the number of items rendered at once (useful to improve performance when displaying large lists).
     */
    constructor(
        app: App,
        private text_items: string[] | ((item: T) => string),
        private items?: T[],
        private placeholder?: string,
        limit?: number
    ) {
        super(app);
        this.setPlaceholder(this.placeholder ? this.placeholder : t('api.ui.suggester-placeholder'));
        this.modalEl.addClass("note-toolbar-ui-modal");
        if (!items) {
            if (Array.isArray(text_items)) {
                // if text_items is a string array, convert it to T[] (if possible)
                this.items = text_items as unknown as T[];
            }
        }
        limit && (this.limit = limit);
    }

    getItems(): T[] {
        return this.items ? this.items : [];
    }

    onClose(): void {
        if (!this.submitted) this.reject(new Error(t('api.ui.error-cancelled')));
    }

    selectSuggestion(value: FuzzyMatch<T>, evt: MouseEvent | KeyboardEvent): void {
        this.submitted = true;
        this.close();
        this.onChooseSuggestion(value, evt);
    }

    renderSuggestion(item: FuzzyMatch<T>, el: HTMLElement): void {
        if (typeof item.item === 'string') {
            // renders text markdown, if provided
            MarkdownRenderer.render(this.app, this.getItemText(item.item), el, '', new Component());
        }
        else {
            super.renderSuggestion(item, el);
        }
    }

    getItemText(item: T): string {
        if (this.text_items instanceof Function) {
            return this.text_items(item);
        }
        if (this.items) {
            return (this.text_items[this.items.indexOf(item)] || t('api.ui.error-undefined'));
        }
        else {
            return t('api.ui.error-undefined');
        }
    }

    onChooseItem(item: T): void {
        this.resolve(item);
    }

    async openAndGetValue(resolve: (value: T) => void, reject: (reason?: Error) => void): Promise<void> {
        this.resolve = resolve;
        this.reject = reject;
        this.open();
    }
}
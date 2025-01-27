import { App, Component, FuzzyMatch, FuzzySuggestModal, MarkdownRenderer } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbSuggesterOptions } from "./INoteToolbarApi";

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
     * @param values Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation.
     * @param keys Array containing the values of each item in the correct order.
     * @param placeholder Placeholder string of the prompt.
     * @param limit Limit the number of items rendered at once (useful to improve performance when displaying large lists).
     */
    constructor(
        app: App,
        private values: string[] | ((item: T) => string),
        private keys?: T[],
        options?: NtbSuggesterOptions 
    ) {

        super(app);

        const { 
            placeholder, 
            limit 
        } = options || {};

        this.setPlaceholder(placeholder ? placeholder : t('api.ui.suggester-placeholder'));
        this.modalEl.addClass("note-toolbar-ui-modal");
        if (!keys) {
            if (Array.isArray(values)) {
                // if it's a string array, convert it to T[] (if possible)
                this.keys = values as unknown as T[];
            }
        }

        limit && (this.limit = limit);

    }

    getItems(): T[] {
        return this.keys ? this.keys : [];
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
        if (this.values instanceof Function) {
            return this.values(item);
        }
        if (this.keys) {
            return (this.values[this.keys.indexOf(item)] || t('api.ui.error-undefined'));
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
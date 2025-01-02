import { App, FuzzyMatch, FuzzySuggestModal } from "obsidian";

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

    constructor(
        app: App,
        private text_items: string[] | ((item: T) => string),
        private items: T[],
        placeholder: string = '',
        limit?: number
    ) {
        super(app);
        this.setPlaceholder(placeholder);
        limit && (this.limit = limit);
    }

    getItems(): T[] {
        return this.items;
    }

    onClose(): void {
        if (!this.submitted) this.reject(new Error("Cancelled prompt"));
    }

    selectSuggestion(
        value: FuzzyMatch<T>,
        evt: MouseEvent | KeyboardEvent
    ): void {
        this.submitted = true;
        this.close();
        this.onChooseSuggestion(value, evt);
    }

    getItemText(item: T): string {
        if (this.text_items instanceof Function) {
            return this.text_items(item);
        }
        return (this.text_items[this.items.indexOf(item)] || "Undefined Text Item");
    }

    onChooseItem(item: T): void {
        this.resolve(item);
    }

    async openAndGetValue(
        resolve: (value: T) => void,
        reject: (reason?: Error) => void
    ): Promise<void> {
        this.resolve = resolve;
        this.reject = reject;
        this.open();
    }
}
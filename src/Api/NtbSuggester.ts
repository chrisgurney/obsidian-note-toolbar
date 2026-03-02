import NoteToolbarPlugin from "main";
import { Component, FuzzyMatch, FuzzySuggestModal, getIcon, MarkdownRenderer, setIcon } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbSuggesterOptions } from "./INoteToolbarApi";

/**
 * Provides a Suggester modal that can be accessed from the Note Toolbar API.
 * 
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/SuggesterModal.ts
 */
export default class NtbSuggester<T> extends FuzzySuggestModal<T> {

    private resolve: (value: T) => void;
    private reject: (reason?: Error) => void;

    private activePrefix?: string;
    private activePrefixStart?: number;
    private originalKeys?: T[];
    private submitted = false;

    private allowCustomInput: boolean;
    private class = '';
    private collapse: boolean;
    private default: string;
    private icon: string;
    private label: string;
    private prefixes: Record<string, () => unknown[]>;
    private rendermd: boolean;

    /**
     * @see INoteToolbarApi.suggester
     */
    constructor(
        private ntb: NoteToolbarPlugin,
        private values?: string[] | ((item: T) => string),
        private keys?: T[],
        options?: NtbSuggesterOptions 
    ) {
        
        // check if `options` was accidentally passed as `keys`
        if (keys !== undefined && keys !== null && !Array.isArray(keys)) {
            throw new Error('ntb.suggester(): The `options` object may have been passed as the `keys` parameter. Set the second parameter to `null` and try again.');
        }

        super(ntb.app);

        const hasValues = this.values !== undefined && this.values !== null;

        this.allowCustomInput = options?.allowCustomInput ?? (hasValues ? false : true);
        this.class = options?.class ?? '';
        this.collapse = options?.collapse ?? (hasValues ? false : true);
        this.default = options?.default ?? '';
        this.icon = options?.icon ?? '';
        this.label = options?.label ?? '';
        if (options?.limit) this.limit = options.limit;
        this.prefixes = options?.prefixes ?? {};
        this.rendermd = options?.rendermd ?? (hasValues ? true : false);

        this.setPlaceholder(options?.placeholder ?? (hasValues ? t('api.ui.suggester-placeholder') : t('api.ui.suggester-placeholder-no-values')));
        this.setInstructions([
            {command: '↑↓', purpose: t('api.ui.instruction-navigate')},
            {command: '↵', purpose: t('api.ui.instruction-select')},
            {command: 'tab', purpose: t('api.ui.instruction-autofill')},
            {command: 'esc', purpose: t('api.ui.instruction-dismiss')},
        ]);

        if (!keys) {
            if (Array.isArray(values)) {
                // if it's a string array, convert it to T[] (if possible)
                this.keys = values as unknown as T[];
            }
        }
        this.originalKeys = this.keys;

        this.modalEl.addClass("note-toolbar-ui");
        this.class && this.modalEl.addClasses([...this.class.split(' ')]);
        this.modalEl.setAttr('data-ntb-ui-type', 'suggester');
    }

    onOpen(): void {

        super.onOpen();

        if (this.icon && getIcon(this.icon)) {
            const inputContainerEl = this.modalEl.querySelector('.prompt-input-container');
            if (inputContainerEl) {
                const iconEl = inputContainerEl.createDiv();
                iconEl.addClass('ntb-suggester-input-icon'),
                inputContainerEl.insertAdjacentElement('afterbegin', iconEl);
                setIcon(iconEl, this.icon);
            }
        }

        if (this.label) {
            const headerEl = this.containerEl.createDiv('ntb-suggester-header');
            const component = new Component();
            MarkdownRenderer.render(this.ntb.app, this.label, headerEl, "", component);
            this.modalEl.insertAdjacentElement('afterbegin', headerEl);
        }

        if (this.default) {
            this.inputEl.value = this.default;
            this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        this.scope.register(null, 'Tab', (e: KeyboardEvent) => this.handleTabCompletion(e));

        if (this.collapse) {
            this.modalEl.toggleClass('ntb-suggester-collapse', !this.inputEl.value);
            this.ntb.registerDomEvent(this.inputEl, 'input', () => {
                this.modalEl.toggleClass('ntb-suggester-collapse', !this.inputEl.value);
            });
        }

    }

    getItems(): T[] {
        return this.keys ? this.keys : [];
    }

    getSuggestions(query: string): FuzzyMatch<T>[] {
        this.keys = this.originalKeys;
        const isEmptyQuery = query.trim().length === 0;

        // check for prefix at start of query, or after the last space
        const lastSpaceIndex = query.lastIndexOf(' ');
        const searchSegment = lastSpaceIndex === -1 ? query.trim() : query.slice(lastSpaceIndex + 1);

        if (this.prefixes && !isEmptyQuery) {
            const prefix = Object.keys(this.prefixes).find(p => searchSegment.startsWith(p));

            if (prefix) {
                this.activePrefix = prefix;
                this.activePrefixStart = lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1;
                this.keys = (this.prefixes[prefix] as () => T[])();
                const strippedQuery = searchSegment.slice(prefix.length);
                const matches = super.getSuggestions(strippedQuery);
                if (this.allowCustomInput && strippedQuery.length > 0) {
                    const customItem = `${prefix}${strippedQuery}` as unknown as T;
                    const alreadyExists = matches.some(match => match.item === customItem);
                    if (!alreadyExists) {
                        return [{ item: customItem, match: { score: 0, matches: [] } } as FuzzyMatch<T>, ...matches];
                    }
                }
                return matches;
            } 
            else {
                this.activePrefix = undefined;
                this.activePrefixStart = undefined;
            }
        }

        if (this.allowCustomInput && !isEmptyQuery) {
            const matches = super.getSuggestions(searchSegment);
            const alreadyExists = matches.some(match => this.getItemText(match.item) === searchSegment);
            if (!alreadyExists) {
                // prepend the custom input option
                return [{ item: query as unknown as T, match: { score: 0, matches: [] } } as FuzzyMatch<T>, ...matches];
            }
            return matches;
        }

        return super.getSuggestions(searchSegment);
    }

    onClose(): void {
        if (!this.submitted) this.reject(new Error(t('api.ui.error-cancelled')));
    }

    selectSuggestion(value: FuzzyMatch<T>, evt: MouseEvent | KeyboardEvent): void {
        if (this.activePrefix !== undefined && this.activePrefixStart !== undefined) {
            // replace just the prefix segment with the selected item
            const before = this.inputEl.value.slice(0, this.activePrefixStart);
            const selected = this.getItemText(value.item);
            value = { ...value, item: `${before}${selected}` as unknown as T };
        }
        this.submitted = true;
        this.close();
        this.onChooseSuggestion(value, evt);
    }

    renderSuggestion(item: FuzzyMatch<T>, el: HTMLElement): void {
        // renders text markdown, if provided
        const component = new Component();
        if (this.rendermd) MarkdownRenderer.render(this.ntb.app, this.getItemText(item.item), el, '', component);
        else el.setText(this.getItemText(item.item)); 
        // if the item is a custom input (not already in the list of suggestions), add a special class for styling #518
        const suggestionKey = this.keys && this.keys.indexOf(item.item);
        const isCustomInput = suggestionKey === -1 && this.getItemText(item.item) === this.inputEl.value;
        if (isCustomInput) el.toggleClass('ntb-is-custom-input', true);
    }

    getItemText(item: T): string {
        if (this.values instanceof Function) {
            return this.values(item);
        }
        if (this.activePrefix !== undefined && typeof item === 'string') {
            return item;
        }
        if (this.keys) {
            const keyIndex = this.keys.indexOf(item);
            if (this.values && this.values instanceof Array && keyIndex !== -1) {
                return this.values[keyIndex] || t('api.ui.error-undefined');
            }
            if (this.allowCustomInput && typeof item === 'string') {
                return item;
            }
            return t('api.ui.error-undefined');
        }
        else {
            if (this.allowCustomInput && typeof item === 'string') {
                return item;
            }
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

    /**
     * When tab is pressed, fills the input with the currently selected option.
     * @param e KeyboardEvent
     */
    private handleTabCompletion = (e: KeyboardEvent) => {
        e.preventDefault();
        const selectedEl = this.modalEl.querySelector('.suggestion-item.is-selected');
        if (selectedEl) {
            const itemText = selectedEl.textContent?.trim();
            if (itemText) {
                let fillText = itemText;
                if (this.allowCustomInput) {
                    // find the key for the displayed value
                    const match = this.getSuggestions(this.inputEl.value)
                        .find(m => this.getItemText(m.item) === itemText);
                    fillText = match ? String(match.item) : itemText;
                }
                if (this.activePrefix !== undefined && this.activePrefixStart !== undefined) {
                    // keep any text before the prefix and append the selected item
                    const before = this.inputEl.value.slice(0, this.activePrefixStart);
                    this.inputEl.value = `${before}${fillText}`;
                } 
                else {
                    // replace only the last segment after the last space
                    const lastSpaceIndex = this.inputEl.value.lastIndexOf(' ');
                    const before = lastSpaceIndex === -1 ? '' : this.inputEl.value.slice(0, lastSpaceIndex + 1);
                    this.inputEl.value = `${before}${fillText}`;
                }
                this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        return false;
    }

}
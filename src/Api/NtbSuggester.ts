import NoteToolbarPlugin from "main";
import { Component, FuzzyMatch, FuzzySuggestModal, getIcon, MarkdownRenderer, setIcon } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbKeyBinding, NtbSuggesterOptions } from "./INoteToolbarApi";

/**
 * Provides a Suggester modal that can be accessed from the Note Toolbar API.
 * 
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/SuggesterModal.ts
 */
export default class NtbSuggester<T> extends FuzzySuggestModal<T> {

    private resolve!: (value: T) => void;
    private reject!: (reason?: Error) => void;

    private activePrefix?: string;
    private activePrefixStart?: number;
    private currentMatches!: FuzzyMatch<T>[];
    private originalKeys?: T[];
    private prefixHandlerActive!: boolean;
    private submitted = false;

    private allowCustomInput: boolean;
    private class = '';
    private collapse: boolean;
    private default: string;
    private exact: boolean;
    private icon: string;
    private keymap: NtbKeyBinding[];
    private label: string;
    private prefixes: Record<string, unknown[] | (() => unknown[] | Promise<unknown>)>
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
        this.exact = options?.exact ?? false;
        this.icon = options?.icon ?? '';
        this.keymap = options?.keymap ?? [];
        this.label = options?.label ?? '';
        if (options?.limit) this.limit = options.limit;
        this.prefixes = options?.prefixes ?? {};
        this.rendermd = options?.rendermd ?? (hasValues ? true : false);

        this.setPlaceholder(options?.placeholder ?? (hasValues ? t('api.ui.suggester-placeholder') : t('api.ui.suggester-placeholder-no-values')));

        // show default keyboard instructions, if key mappings are not provided
        if (this.keymap.length === 0) {
            this.setInstructions([
                {command: '↑↓', purpose: t('api.ui.instruction-navigate')},
                {command: '↵', purpose: t('api.ui.instruction-select')},
                {command: 'tab', purpose: t('api.ui.instruction-autofill')},
                {command: 'esc', purpose: t('api.ui.instruction-dismiss')},
            ]);
        }

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

        if (this.collapse) {
            this.modalEl.toggleClass('ntb-suggester-collapse', !this.inputEl.value);
            this.ntb.registerDomEvent(this.inputEl, 'input', () => {
                this.modalEl.toggleClass('ntb-suggester-collapse', !this.inputEl.value);
            });
        }

        // key mappings: custom bindings with modifiers should be first, to prevent them being swallowed by bare key registrations
        const keymapBindingsFirst = [...this.keymap ?? []].sort((a, b) => (b.modifiers?.length ?? 0) - (a.modifiers?.length ?? 0));
        keymapBindingsFirst.forEach(({ modifiers, key, action }) => {
            this.scope.register(modifiers ?? null, key, (e) => {
                if (action === 'navigateNext') this.chooser.setSelectedItem(this.chooser.selectedItem + 1, e);
                else if (action === 'navigatePrev') this.chooser.setSelectedItem(this.chooser.selectedItem - 1, e);
                else if (action === 'select') this.chooser.useSelectedItem(e);
                else if (action === 'dismiss') this.close();
                else if (action === 'autofill') this.handleTabCompletion(e);
                else return action();
                return false;
            });
        });

        // key mappings: default case where `Tab` hasn't been remapped
        const hasTabOverride = this.keymap?.some(k => k.key === 'Tab' && (!k.modifiers || k.modifiers.length === 0) && k.action !== 'autofill');
        if (!hasTabOverride) this.scope.register(null, 'Tab', (e) => this.handleTabCompletion(e));

    }

    getItems(): T[] {
        return this.keys ? this.keys : [];
    }

    getSuggestions(query: string): FuzzyMatch<T>[] {
        this.keys = this.originalKeys;
        const isEmptyQuery = query.trim().length === 0;
        if (isEmptyQuery) {
            this.activePrefix = undefined;
            this.activePrefixStart = undefined;
        }

        // check for prefix at start of query, or after the last space
        const lastSpaceIndex = query.lastIndexOf(' ');
        const searchSegment = lastSpaceIndex === -1 ? query.trim() : query.slice(lastSpaceIndex + 1);

        if (this.prefixes && !isEmptyQuery) {
            const prefix = Object.keys(this.prefixes).find(p => searchSegment.startsWith(p));
            if (prefix) {
                return this.getPrefixSuggestions(prefix, searchSegment, lastSpaceIndex, query);
            }
            else {
                this.activePrefix = undefined;
                this.activePrefixStart = undefined;
            }
        }

        if (this.allowCustomInput && !isEmptyQuery) {
            const matches = this.exact
                ? this.getExactSuggestions(searchSegment)
                : super.getSuggestions(searchSegment);
            const alreadyExists = matches.some(match => this.getItemText(match.item) === query);
            if (!alreadyExists) {
                // prepend the custom input option
                return this.saveMatches(
                    [{ item: query as unknown as T, match: { score: 0, matches: [] } } as FuzzyMatch<T>, ...matches]
                );
            }
            return this.saveMatches(matches);
        }

        const matches = super.getSuggestions(searchSegment);
        return this.saveMatches(
            this.exact ? this.getExactSuggestions(searchSegment) : matches
        );
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
        // trim trailing spaces
        if (typeof value.item === 'string') {
            value = { ...value, item: (value.item as string).trimEnd() as unknown as T };
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
        }
        if (this.allowCustomInput && typeof item === 'string') {
            return item;
        }
        return t('api.ui.error-undefined');
    }

    onChooseItem(item: T): void {
        this.resolve(item);
    }

    async openAndGetValue(resolve: (value: T) => void, reject: (reason?: Error) => void): Promise<void> {
        this.resolve = resolve;
        this.reject = reject;
        this.open();
    }

    /*************************************************************************
	 * HANDLERS
	 *************************************************************************/

    /**
     * When tab is pressed, fills the input with the currently selected option.
     * @param e KeyboardEvent
     */
    private handleTabCompletion = (e: KeyboardEvent) => {
        e.preventDefault();
        const selectedEl = this.modalEl.querySelector('.suggestion-item.is-selected');
        if (selectedEl) {
            const allItems = this.modalEl.querySelectorAll('.suggestion-item');
            const index = Array.from(allItems).indexOf(selectedEl as HTMLElement);
            const suggestion = index !== -1 ? this.currentMatches[index] : undefined;
            if (suggestion) {
                const fillText = String(suggestion.item);
                if (this.activePrefix !== undefined && this.activePrefixStart !== undefined) {
                    const before = this.inputEl.value.slice(0, this.activePrefixStart);
                    this.inputEl.value = `${before}${fillText}`;
                } 
                else {
                    const lastSpaceIndex = this.inputEl.value.lastIndexOf(' ');
                    const before = lastSpaceIndex === -1 ? '' : this.inputEl.value.slice(0, lastSpaceIndex + 1);
                    this.inputEl.value = `${before}${fillText} `;
                }
                this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        return false;
    }

	/*************************************************************************
	 * HELPERS
	 *************************************************************************/

    /**
     * Returns substring-matched suggestions sorted by relevance, for use when fuzzy matching is disabled.
     * Filters to only items whose text contains the query as a literal substring (case-insensitive),
     * excluding fuzzy character-scatter matches. Results are sorted by starts-with first, then includes,
     * then alphabetically.
     *
     * @param query - the search string to match against item text
     * @returns array of matched items as {@link FuzzyMatch} objects with zeroed scores
     */
    private getExactSuggestions(query: string): FuzzyMatch<T>[] {
        if (!query) return this.getItems().map(item => ({ item, match: { score: 0, matches: [] } } as FuzzyMatch<T>));
        const q = query.toLowerCase();
        return this.getItems()
            .filter(item => this.getItemText(item).toLowerCase().includes(q))
            .map(item => ({ item, match: { score: 0, matches: [] } } as FuzzyMatch<T>))
            .sort((a, b) => {
                const aText = this.getItemText(a.item).toLowerCase();
                const bText = this.getItemText(b.item).toLowerCase();
                const aStarts = aText.startsWith(q);
                const bStarts = bText.startsWith(q);
                if (aStarts !== bStarts) return aStarts ? -1 : 1;
                const aIncludes = aText.includes(q);
                const bIncludes = bText.includes(q);
                if (aIncludes !== bIncludes) return aIncludes ? -1 : 1;
                return aText.localeCompare(bText);
            });
    }

    /**
     * Returns suggestions for a query that begins with a recognized prefix.
     * @param prefix the matched prefix string
     * @param searchSegment the portion of the query being searched (from last space or start)
     * @param lastSpaceIndex index of the last space in the original query, or -1 if none
     * @param query the current query
     */
    private getPrefixSuggestions(prefix: string, searchSegment: string, lastSpaceIndex: number, query: string): FuzzyMatch<T>[] {

        // handle async prefix functions: fire it, inject the result into the input when resolved, and block re-firing while pending
        if (this.prefixHandlerActive) return this.saveMatches([]);
        const prefixFn = typeof this.prefixes![prefix] === 'function'
            ? this.prefixes![prefix] as () => unknown[] | Promise<unknown>
            : () => this.prefixes![prefix] as unknown[];
        const prefixFnResult = prefixFn();
        if (prefixFnResult instanceof Promise) {
            if (this.prefixHandlerActive) return this.saveMatches([]);
            this.prefixHandlerActive = true;
            prefixFnResult.then(item => {
                // return nothing when nothing's selected (e.g., Escape is pressed)
                if (item === null) {
                    this.prefixHandlerActive = false;
                    return;
                }
                const before = lastSpaceIndex === -1 ? '' : query.slice(0, lastSpaceIndex + 1);
                this.inputEl.value = `${before}${item} `;
                this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                this.prefixHandlerActive = false;
            }).catch(() => {
                this.prefixHandlerActive = false;
            });
            // getSuggestions can't be async, so we return an empty result set immediately here (and resolve later)
            return this.saveMatches([]);
        }

        // handle non-async prefix code
        this.activePrefix = prefix;
        this.activePrefixStart = lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1;
        this.keys = (typeof this.prefixes![prefix] === 'function'
            ? (this.prefixes![prefix] as () => T[])()
            : this.prefixes![prefix] as T[]);

        // if there's only one suggestion, just return it
        if (this.keys.length === 1) {
            const before = lastSpaceIndex === -1 ? '' : query.slice(0, lastSpaceIndex + 1);
            this.inputEl.value = `${before}${this.getItemText(this.keys[0])} `;
            this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            return this.currentMatches;
        }

        const strippedQuery = searchSegment.slice(prefix.length);
        const matches = this.exact
            ? this.getExactSuggestions(strippedQuery)
            : super.getSuggestions(strippedQuery);
        if (this.allowCustomInput && strippedQuery.length > 0) {
            if (!matches.some(match => this.getItemText(match.item) === query)) {
                return this.saveMatches(
                    [{ item: query as unknown as T, match: { score: 0, matches: [] } } as FuzzyMatch<T>, ...matches]
                );
            }
        }
        return this.saveMatches(matches);
    }

    /**
     * Saves provided matches to a variable for later reference (by tab completion), and returns them.
     */
    private saveMatches(matches: FuzzyMatch<T>[]): FuzzyMatch<T>[] {
        this.currentMatches = matches;
        return matches;
    }

}
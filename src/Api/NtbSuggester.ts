import { App, Component, FuzzyMatch, FuzzySuggestModal, MarkdownRenderer } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbSuggesterOptions } from "./INoteToolbarApi";
import NoteToolbarPlugin from "main";

/**
 * Provides a Suggester modal that can be accessed from the Note Toolbar API.
 * 
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/SuggesterModal.ts
 */
export class NtbSuggester<T> extends FuzzySuggestModal<T> {

    private resolve: (value: T) => void;
    private reject: (reason?: Error) => void;

    private submitted = false;

    private allowCustomInput: boolean = false;
    private class = '';
    private default: string;
    private label: string;
    private rendermd;

    /**
     * @see INoteToolbarApi.suggester
     */
    constructor(
        private plugin: NoteToolbarPlugin,
        private values: string[] | ((item: T) => string),
        private keys?: T[],
        options?: NtbSuggesterOptions 
    ) {

        super(plugin.app);

        const { 
            allowCustomInput = false,
            class: css_classes = '',
            default: default_value = '',
            label: label_text = '',
            limit,
            placeholder,
            rendermd = true, 
        } = options || {};

        this.allowCustomInput = allowCustomInput;
        this.class = css_classes;
        this.default = default_value;
        this.label = label_text;
        this.rendermd = rendermd;
        this.setPlaceholder(placeholder ? placeholder : t('api.ui.suggester-placeholder'));
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
        
        limit && (this.limit = limit);
        
        this.modalEl.addClass("note-toolbar-ui");
        this.class && this.modalEl.addClasses([...this.class.split(' ')]);
        this.modalEl.setAttr('data-ntb-ui-type', 'suggester');
    }

    onOpen(): void {

        super.onOpen();

        if (this.label) {
            const headerEl = this.containerEl.createDiv('ntb-suggester-header');
            const component = new Component();
            MarkdownRenderer.render(this.plugin.app, this.label, headerEl, "", component);
            this.modalEl.insertAdjacentElement('afterbegin', headerEl);
        }

        if (this.default) {
            this.inputEl.value = this.default;
            this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // when tab is pressed, fill the input with the currently selected option
        this.scope.register(null, 'Tab', (e: KeyboardEvent) => {
            e.preventDefault();
            const selectedEl = this.modalEl.querySelector('.suggestion-item.is-selected');
            if (selectedEl) {
                const itemText = selectedEl.textContent?.trim();
                if (itemText) {
                    this.inputEl.value = itemText;
                    this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            return false;
        });

    }

    getItems(): T[] {
        return this.keys ? this.keys : [];
    }

    getSuggestions(query: string): FuzzyMatch<T>[] {
        if (this.allowCustomInput && query.trim().length > 0) {
            const matches = super.getSuggestions(query);
            // add the raw query as a custom option if it's not already in the matches
            const queryAsOption = query as unknown as T;
            const alreadyExists = matches.some(match => {
                const item = 'item' in match ? match.item : match;
                return this.getItemText(item) === query;
            });
            if (!alreadyExists) {
                // prepend the custom input option
                return [{ item: queryAsOption, match: { score: 0, matches: [] } } as FuzzyMatch<T>, ...matches];
            }
            return matches;
        }
        return super.getSuggestions(query);
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
        // renders text markdown, if provided
        const component = new Component();
        if (this.rendermd) MarkdownRenderer.render(this.plugin.app, this.getItemText(item.item), el, '', component);
        else el.setText(this.getItemText(item.item));
    }

    getItemText(item: T): string {
        if (this.values instanceof Function) {
            return this.values(item);
        }
        if (this.keys) {
            const keyIndex = this.keys.indexOf(item);
            if (keyIndex !== -1) {
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
}
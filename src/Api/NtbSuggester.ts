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
    private class = '';
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
            class: css_classes = '',
            limit,
            placeholder,
            rendermd = true, 
        } = options || {};

        this.class = css_classes;
        this.rendermd = rendermd;
        this.setPlaceholder(placeholder ? placeholder : t('api.ui.suggester-placeholder'));
        this.setInstructions([
            {command: '↑↓', purpose: t('api.ui.instruction-navigate')},
            {command: '↵', purpose: t('api.ui.instruction-select')},
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
        // renders text markdown, if provided
        if (this.rendermd) MarkdownRenderer.render(this.plugin.app, this.getItemText(item.item), el, '', new Component());
        else el.setText(this.getItemText(item.item));
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
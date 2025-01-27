import {App, ButtonComponent, Component, MarkdownRenderer, Modal,
    Platform,
    TextAreaComponent,
    TextComponent,
} from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbPromptOptions } from "./INoteToolbarApi";

/**
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/PromptModal.ts
 */

export class PromptModal extends Modal {

    private resolve: (value: string) => void;
    private reject: (reason?: Error) => void;

    private submitted = false;
    private value: string;

    private prompt_text: string;
    private multi_line: boolean;
    private placeholder: string;
    private default_value: string;

    /**
     * @param options.prompt_text: Text placed above the input field.
     * @param options.multi_line: If set to true, the input field will be a multiline textarea. Defaults to false.
     * @param options.placeholder Placeholder string of the prompt.
     * @param options.default_value: A default value for the input field.
     * @returns The user's input.
     */
    constructor (app: App, private options?: NtbPromptOptions) {

        super(app);

        const {
            prompt_text = '',
            multi_line = false,
            placeholder = t('api.ui.prompt-placeholder'),
            default_value = ''
        } = this.options || {};

        this.prompt_text = prompt_text;
        this.multi_line = multi_line;
        this.placeholder = placeholder;
        this.default_value = default_value;

        this.modalEl.addClasses(['prompt', 'note-toolbar-ui-modal']);
        if (!this.prompt_text) this.modalEl.setAttr('data-ntb-ui-mode', 'compact');
    }

    onOpen(): void {
        if (this.prompt_text) {
            MarkdownRenderer.render(this.app, this.prompt_text, this.titleEl, "", new Component());
        }
        this.createForm();
    }

    onClose(): void {
        this.contentEl.empty();
        if (!this.submitted) this.reject(new Error(t('api.ui.error-cancelled')));
    }

    createForm(): void {
        const div = this.contentEl.createDiv();
        div.addClass('note-toolbar-ui-div');
        let textInput: TextComponent | TextAreaComponent;
        if (this.multi_line) {
            textInput = new TextAreaComponent(div);

            // add submit button since enter needed for multiline input on mobile
            const buttonDiv = this.contentEl.createDiv();
            buttonDiv.addClass('note-toolbar-ui-button-div');
            const submitButton = new ButtonComponent(buttonDiv);
            submitButton.buttonEl.addClass("mod-cta");
            submitButton.setButtonText(t('api.ui.button-submit')).onClick((evt: Event) => {
                this.resolveAndClose(evt);
            });
        } else {
            textInput = new TextComponent(div);
        }

        this.value = this.default_value ?? '';
        textInput.inputEl.addClass('note-toolbar-ui-input');
        textInput.setPlaceholder(this.placeholder);
        textInput.setValue(this.value);
        textInput.onChange((value) => (this.value = value));
        textInput.inputEl.focus();
        textInput.inputEl.addEventListener("keydown", (evt: KeyboardEvent) =>
            this.enterCallback(evt)
        );
    }

    private enterCallback(evt: KeyboardEvent) {
        // Fix for Korean inputs https://github.com/SilentVoid13/Templater/issues/1284
        if (evt.isComposing || evt.keyCode === 229) return;

        if (this.multi_line) {
            if (Platform.isDesktop && evt.key === "Enter" && !evt.shiftKey) {
                this.resolveAndClose(evt);
            }
        } else {
            if (evt.key === "Enter") {
                this.resolveAndClose(evt);
            }
        }
    }

    private resolveAndClose(evt: Event | KeyboardEvent) {
        this.submitted = true;
        evt.preventDefault();
        this.resolve(this.value);
        this.close();
    }

    async openAndGetValue(resolve: (value: string) => void, reject: (reason?: Error) => void): Promise<void> {
        this.resolve = resolve;
        this.reject = reject;
        this.open();
    }
}
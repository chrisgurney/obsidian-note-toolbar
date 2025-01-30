import {App, ButtonComponent, Component, MarkdownRenderer, Modal,
    Platform,
    TextAreaComponent,
    TextComponent,
} from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbPromptOptions } from "./INoteToolbarApi";
import NoteToolbarPlugin from "main";

/**
 * Provides a prompt modal that can be accessed from the Note Toolbar API.
 * 
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/PromptModal.ts
 */
export class NtbPrompt extends Modal {

    private resolve: (value: string) => void;
    private reject: (reason?: Error) => void;

    private submitted = false;
    private value: string;

    private label: string;
    private large: boolean;
    private placeholder: string;
    private default: string;

    /**
     * @see INoteToolbarApi.prompt
     */
    constructor(
        private plugin: NoteToolbarPlugin,
        private options?: NtbPromptOptions
    ) {

        super(plugin.app);

        const {
            label: prompt_text = '',
            large: multi_line = false,
            placeholder = t('api.ui.prompt-placeholder'),
            default: default_value = ''
        } = this.options || {};

        this.label = prompt_text;
        this.large = multi_line;
        this.placeholder = placeholder;
        this.default = default_value;

        this.modalEl.addClasses(['prompt', 'note-toolbar-ui']);
        if (!this.label) this.modalEl.setAttr('data-ntb-ui-mode', 'compact');
    }

    onOpen(): void {
        if (this.label) {
            MarkdownRenderer.render(this.plugin.app, this.label, this.titleEl, "", new Component());
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
        if (this.large) {
            textInput = new TextAreaComponent(div);

            // add submit button since enter needed for multiline input on mobile
            const buttonDiv = this.contentEl.createDiv();
            buttonDiv.addClass('note-toolbar-ui-button-div');
            const submitButton = new ButtonComponent(buttonDiv);
            submitButton.buttonEl.addClass("mod-cta");
            submitButton.setButtonText(t('api.ui.button-submit')).onClick((e: Event) => {
                this.resolveAndClose(e);
            });
        } else {
            textInput = new TextComponent(div);
        }

        this.value = this.default ?? '';
        textInput.inputEl.addClass('note-toolbar-ui-input');
        textInput.setPlaceholder(this.placeholder);
        textInput.setValue(this.value);
        textInput.onChange((value) => (this.value = value));
        textInput.inputEl.focus();
        textInput.inputEl.addEventListener("keydown", (evt: KeyboardEvent) =>
            this.enterCallback(evt)
        );
    }

    private enterCallback(e: KeyboardEvent) {
        // fix for Korean inputs from Templater: https://github.com/SilentVoid13/Templater/issues/1284
        if (e.isComposing || e.keyCode === 229) return;

        if (this.large) {
            const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
            if (e.key === "Enter" && ((Platform.isDesktop && !e.shiftKey) || modifierPressed)) {
                this.resolveAndClose(e);
            }
        }
        else {
            if (e.key === "Enter") {
                this.resolveAndClose(e);
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
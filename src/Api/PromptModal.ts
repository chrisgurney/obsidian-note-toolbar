import {App, ButtonComponent, Component, MarkdownRenderer, Modal,
    Platform,
    TextAreaComponent,
    TextComponent,
} from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbPromptOptions } from "./INoteToolbarApi";
import NoteToolbarPlugin from "main";

/**
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/PromptModal.ts
 */

export class PromptModal extends Modal {

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

        this.modalEl.addClasses(['prompt', 'note-toolbar-ui-modal']);
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

            // listen for submit on enter with modifier key
            this.plugin.registerDomEvent(
                textInput.inputEl, 'keydown', (e: KeyboardEvent) => {
                    if (e.key === 'enter') {
                        const modifierPressed = (Platform.isWin || Platform.isLinux) ? e?.ctrlKey : e?.metaKey;
                        console.log('enter', modifierPressed);
                        this.resolveAndClose(e);
                    }
                }
            );

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

    private enterCallback(evt: KeyboardEvent) {
        // fix for Korean inputs from Templater: https://github.com/SilentVoid13/Templater/issues/1284
        if (evt.isComposing || evt.keyCode === 229) return;

        if (this.large) {
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
import {App, ButtonComponent, Modal,
    Platform,
    TextAreaComponent,
    TextComponent,
} from "obsidian";
import { t } from "Settings/NoteToolbarSettings";

/**
 * Adapted from Templater:
 * @link https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/internal_functions/system/PromptModal.ts
 */

export class PromptModal extends Modal {
    private resolve: (value: string) => void;
    private reject: (reason?: Error) => void;
    private submitted = false;
    private value: string;

    /**
     * @param prompt_text: Text placed above the input field.
     * @param multi_line: If set to true, the input field will be a multiline textarea. Defaults to false.
     * @param placeholder Placeholder string of the prompt.
     * @param default_value: A default value for the input field.
     * @returns The user's input.
     */
    constructor (
        app: App,
        private prompt_text: string = '',
        private multi_line: boolean = false,
        private placeholder: string = t('api.ui.prompt-placeholder'),
        private default_value: string = ''
    ) {
        super(app);
        this.modalEl.addClasses(['prompt', 'note-toolbar-ui-modal']);
        if (!this.prompt_text) this.modalEl.setAttr('data-ntb-ui-mode', 'compact');
    }

    onOpen(): void {
        if (this.prompt_text) this.titleEl.setText(this.prompt_text);
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
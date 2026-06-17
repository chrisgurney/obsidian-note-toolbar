import NoteToolbarPlugin from "main";
import { Component, MarkdownRenderer, Modal } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";

/**
 * Displays a message with an optional link to an external resource.
 */
export default class LinkModal extends Modal {

	constructor(
        private ntb: NoteToolbarPlugin,
        private title: string,
        private desc?: string,
        private link?: string,
        private cta?: string,
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-link-dialog', 'note-toolbar-setting-dialog-phonefix');
    }

    public onOpen() {
        this.setTitle(this.title);
        this.display();
    }

    public display() {

        this.contentEl.empty();
        this.modalEl.addClass('note-toolbar-setting-modal-container');

        if (this.desc) {
            const component = new Component();
            void MarkdownRenderer.render(this.ntb.app, this.desc, this.contentEl, '', component);
        }

        this.contentEl.createDiv({ cls: 'note-toolbar-setting-link' }).append(
            createDiv({ cls: 'note-toolbar-setting-link-text', text: '' }),
            createEl('a', { cls: 'note-toolbar-setting-link-button', text: this.cta || t('setting.help.button-open-external'), href: this.link, attr: { 'aria-label': t('setting.help.button-open') } })
        );

    }

}
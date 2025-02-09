import {Component, MarkdownRenderer, Modal, Notice, TFile} from "obsidian";
import { NtbModalOptions } from "./INoteToolbarApi";
import NoteToolbarPlugin from "main";

/**
 * Provides a modal that can be accessed from the Note Toolbar API.
 */
export class NtbModal extends Modal {

    private resolve: (value: string) => void;
    private reject: (reason?: Error) => void;

    private title: string;
    private class: string;

    /**
     * @see INoteToolbarApi.modal
     */
    constructor(
        private plugin: NoteToolbarPlugin,
        private content: string | TFile,
        private options?: NtbModalOptions
    ) {
        super(plugin.app);

        const {
            title: title = '',
            class: css_classes = ''
        } = this.options || {};

        this.title = title;
        this.class = css_classes;

        this.modalEl.addClasses(['prompt', 'note-toolbar-ui']);
        this.class && this.modalEl.addClasses([...this.class.split(' ')]);
        this.modalEl.setAttr('data-ntb-ui-type', 'modal');
        if (!this.title) this.modalEl.setAttr('data-ntb-ui-mode', 'noheader');
    }

    onOpen(): void {
        if (this.title) {
            // this.titleEl.setText(this.title);
            let containerEl = this.titleEl.createEl('div', {cls: 'markdown-preview-view'});
            MarkdownRenderer.render(this.plugin.app, this.title, containerEl, "", new Component());
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }

    // private resolveAndClose(evt: Event | KeyboardEvent) {
    //     evt.preventDefault();
    //     this.resolve(this.value);
    //     this.close();
    // }

    async openWithContent(resolve: (value: string) => void, reject: (reason?: Error) => void): Promise<void> {

        let containerEl = this.contentEl.createEl('div', {cls: 'markdown-preview-view'});

        // render content as markdown
        if (typeof this.content === 'string') {
            await MarkdownRenderer.render(this.plugin.app, this.content, containerEl, "", new Component());
        } 
        else {
            try {
                const fileContent = await this.app.vault.read(this.content);
                await MarkdownRenderer.render(this.plugin.app, fileContent, containerEl, "", new Component());
            }
            catch (error) {
                new Notice(error);
            }
        }

        // make links tabbable
        containerEl.querySelectorAll('a.internal-link, a.external-link').forEach((link) => {
            (link as HTMLElement).tabIndex = 1;
            if (link.hasClass('internal-link')) {
                this.plugin.registerDomEvent(link as HTMLElement, 'click', (event) => {
                    event.preventDefault();
                    const target = link.getAttribute('href');
                    if (target) this.plugin.app.workspace.openLinkText(target, '', true);
                });
            }
        });

        // set focus in modal
        this.contentEl.tabIndex = 1;
        setTimeout(() => {
            this.contentEl.focus();
        }, 50);

        this.resolve = resolve;
        this.reject = reject;
        this.open();
        
    }
}
import {Component, MarkdownRenderer, Modal, Notice, TFile, WorkspaceLeaf} from "obsidian";
import { NtbModalOptions } from "./INoteToolbarApi";
import NoteToolbarPlugin from "main";
import { t } from "Settings/NoteToolbarSettings";

/**
 * Provides a modal that can be accessed from the Note Toolbar API.
 */
export class NtbModal extends Modal {

    private title: string;
    private isEditable: boolean;
    private class: string;

    private leaf: WorkspaceLeaf;

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
            editable: editable = false,
            class: css_classes = ''
        } = this.options || {};

        this.title = title;
        this.isEditable = editable;
        this.class = css_classes;

        this.modalEl.addClasses(['prompt', 'note-toolbar-ui']);
        this.class && this.modalEl.addClasses([...this.class.split(' ')]);
        this.modalEl.setAttr('data-ntb-ui-type', 'modal');
        if (!this.title) this.modalEl.setAttr('data-ntb-ui-mode', 'noheader');
    }

    async onOpen(): Promise<void> {
        if (this.title) {
            let containerEl = this.titleEl.createEl('div', {cls: 'markdown-preview-view'});
            MarkdownRenderer.render(this.plugin.app, this.title, containerEl, "", new Component());
        }
        if (this.isEditable && this.content instanceof TFile) {
            // adapted from https://github.com/likemuuxi/obsidian-modal-opener (MIT license)
            this.leaf = this.plugin.app.workspace.createLeafInParent(this.plugin.app.workspace.rootSplit, 0);
            if (this.leaf) (this.leaf as any).containerEl.style.display = 'none';
            await this.leaf.openFile(this.content);
            this.contentEl.appendChild(this.leaf.view.containerEl);
        }
    }

    onClose(): void {
        this.contentEl.empty();
        this.leaf?.detach();
    }

    async displayMarkdown(): Promise<void> {

        let containerEl = this.contentEl.createEl('div', {cls: 'markdown-preview-view'});

        // render content as markdown
        if (typeof this.content === 'string') {
            await MarkdownRenderer.render(this.plugin.app, this.content, containerEl, "", new Component());
        } 
        else {
            try {
                // only render markdown files
                if (['md', 'markdown'].includes(this.content.extension)) {
                    const fileContent = await this.app.vault.cachedRead(this.content);
                    await MarkdownRenderer.render(this.plugin.app, fileContent, containerEl, "", new Component());
                }
                else {
                    new Notice(t('api.ui.error-file-unsupported'));
                    return;
                };
            }
            catch (error) {
                new Notice(error);
            }
        }

        // make links tabbable
        this.modalEl.querySelectorAll('a.internal-link, a.external-link').forEach((link) => {
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

        this.open();

    }

    async displayEditor(): Promise<void> {
        this.open();
    }

}
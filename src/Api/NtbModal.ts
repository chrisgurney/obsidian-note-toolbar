import {Component, MarkdownRenderer, Modal, normalizePath, Notice, TFile, WorkspaceLeaf} from "obsidian";
import { NtbModalOptions } from "./INoteToolbarApi";
import NoteToolbarPlugin from "main";
import { t } from "Settings/NoteToolbarSettings";

/**
 * Provides a modal that can be accessed from the Note Toolbar API.
 */
export default class NtbModal extends Modal {

    private title: string;
    private isEditable: boolean;
    private isWebviewer: boolean;
    private class: string;

    private leaf: WorkspaceLeaf;

    /**
     * @see INoteToolbarApi.modal
     */
    constructor(
        private ntb: NoteToolbarPlugin,
        private content: string | TFile,
        private options?: NtbModalOptions
    ) {
        super(ntb.app);

        const {
            title: title = '',
            editable: editable = false,
            webpage: webpage = false,
            class: css_classes = ''
        } = this.options || {};

        this.title = title;
        this.isEditable = editable;
        this.isWebviewer = webpage;
        this.class = css_classes;

        this.modalEl.addClasses(['prompt', 'note-toolbar-ui']);
        this.class && this.modalEl.addClasses([...this.class.split(' ')]);
        this.modalEl.setAttr('data-ntb-ui-type', 'modal');
        if (!this.title) this.modalEl.setAttr('data-ntb-ui-mode', 'noheader');
    }

    async onOpen(): Promise<void> {
        if (this.title) {
            let containerEl = this.titleEl.createEl('div', {cls: 'markdown-preview-view'});
            const component = new Component();
            MarkdownRenderer.render(this.ntb.app, this.title, containerEl, "", component);
        }
        if (this.isEditable && this.content instanceof TFile) {
            // adapted from https://github.com/likemuuxi/obsidian-modal-opener (MIT license)
            this.leaf = this.ntb.app.workspace.createLeafInParent(this.ntb.app.workspace.rootSplit, 0);
            if (this.leaf) (this.leaf as any).containerEl.hide();
            await this.leaf.openFile(this.content);
            this.contentEl.appendChild(this.leaf.view.containerEl);
        }
        else if (this.isWebviewer && typeof this.content === 'string') {
            this.leaf = this.ntb.app.workspace.createLeafInParent(this.ntb.app.workspace.rootSplit, 0);
            if (this.leaf) (this.leaf as any).containerEl.hide();
            await this.leaf.setViewState({type: 'webviewer', state: { url: this.content, navigate: true }, active: true});
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
            const component = new Component();
            await MarkdownRenderer.render(this.ntb.app, this.content, containerEl, "", component);
        } 
        else {
            try {
                const ext = this.content.extension;
                // only render markdown files
                if (['md', 'markdown'].includes(ext)) {
                    const fileContent = await this.app.vault.cachedRead(this.content);
                    const component = new Component();
                    await MarkdownRenderer.render(this.ntb.app, fileContent, containerEl, normalizePath(this.content.path), component);

                    // make links tabbable
                    this.modalEl.querySelectorAll('a.internal-link, a.external-link').forEach((link) => {
                        (link as HTMLElement).tabIndex = 1;
                        if (link.hasClass('internal-link')) {
                            this.ntb.registerDomEvent(link as HTMLElement, 'click', (event) => {
                                event.preventDefault();
                                const target = link.getAttribute('href');
                                if (target) this.ntb.app.workspace.openLinkText(target, '', true);
                            });
                        }
                    });
                }
                // FIXME: PDF viewer not rendering correctly; display notice for now
                else if (['pdf'].includes(ext)) {
                    new Notice(t('api.ui.error-file-unsupported', {filetype: ext}));
                    return;
                }
                // attempt to embed everything else
                else {
                    const embedMd = `![[${this.content.path}]]`;
                    const embedMdComponent = new Component();
                    await MarkdownRenderer.render(this.ntb.app, embedMd, containerEl, "", embedMdComponent);
                };
            }
            catch (error) {
                new Notice(error);
            }
        }

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

    async displayWebpage(): Promise<void> {
        this.open();
    }

}
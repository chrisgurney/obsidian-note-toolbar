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
    private contextPath: string;

    private leaf!: WorkspaceLeaf;
    private component!: Component;

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
            contextPath: contextPath,
            originAsContext: originAsContext = false,
            class: css_classes = ''
        } = this.options || {};

        this.title = title;
        this.isEditable = editable;
        this.isWebviewer = webpage;
        this.class = css_classes;

        // for Markdown rendering context (including Bases):
        // unless specified, use the file that opened the modal as context (assumes the active file); default to ''
        const activeFilePath = this.ntb.app.workspace.getActiveFile()?.path ?? '';
        this.contextPath = 
            contextPath ??
            (originAsContext
                ? activeFilePath
                : ((this.content instanceof TFile) ? this.content.path : ''));

        this.modalEl.addClasses(['prompt', 'note-toolbar-ui']);
        if (this.class) this.modalEl.addClasses([...this.class.split(' ')]);
        this.modalEl.setAttr('data-ntb-ui-type', 'modal');
        if (!this.title) this.modalEl.setAttr('data-ntb-ui-mode', 'noheader');

        this.component = new Component();
        this.component.load();
    }

    async onOpen(): Promise<void> {
        activeDocument.body.toggleClass('ntb-is-modal-displayed', true);
        if (this.title) {
            const containerEl = this.titleEl.createDiv({ cls: 'markdown-preview-view' });
            await MarkdownRenderer.render(this.ntb.app, this.title, containerEl, "", this.component);
        }
        if (this.isEditable && this.content instanceof TFile) {
            // adapted from https://github.com/likemuuxi/obsidian-modal-opener (MIT license)
            this.leaf = this.ntb.app.workspace.createLeafInParent(this.ntb.app.workspace.rootSplit, 0);
            if (this.leaf) (this.leaf.containerEl as HTMLElement).hide();
            await this.leaf.openFile(this.content);
            this.contentEl.appendChild(this.leaf.view.containerEl);
        }
        else if (this.isWebviewer && typeof this.content === 'string') {
            this.leaf = this.ntb.app.workspace.createLeafInParent(this.ntb.app.workspace.rootSplit, 0);
            if (this.leaf) (this.leaf.containerEl as HTMLElement).hide();
            await this.leaf.setViewState({type: 'webviewer', state: { url: this.content, navigate: true }, active: true});
            // hide the web viewer's header (remove if nobody requests this)
            // const webviewerHeaderEl = this.leaf.view.containerEl.querySelector<HTMLElement>('.view-header.view-header-always-show');
            // if (webviewerHeaderEl) {
            //     webviewerHeaderEl.removeClass('view-header-always-show');
            //     webviewerHeaderEl.hide();
            // }
            this.contentEl.appendChild(this.leaf.view.containerEl);
        }
    }

    onClose(): void {
        activeDocument.body.toggleClass('ntb-is-modal-displayed', false);
        this.component.unload();
        this.contentEl.empty();
        this.leaf?.detach();
    }

    async displayMarkdown(): Promise<void> {

        this.open();

        const containerEl = this.contentEl.createDiv({cls: 'markdown-preview-view'});

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
                    await MarkdownRenderer.render(this.ntb.app, fileContent, containerEl, normalizePath(this.content.path), this.component);

                    // make links tabbable
                    this.modalEl.querySelectorAll<HTMLElement>('a.internal-link, a.external-link').forEach((link) => {
                        link.tabIndex = 1;
                        if (link.hasClass('internal-link')) {
                            this.ntb.registerDomEvent(link, 'click', async (event) => {
                                event.preventDefault();
                                const target = link.getAttribute('href');
                                if (target) await this.ntb.app.workspace.openLinkText(target, '', true);
                            });
                        }
                    });
                }
                // FIXME: PDF viewer not rendering correctly; display notice for now
                else if (['pdf'].includes(ext)) {
                    new Notice(t('api.ui.error-file-unsupported', {filetype: ext})).containerEl.addClass('mod-warning');
                    return;
                }
                // attempt to embed everything else
                else {
                    const embedMd = `![[${this.content.path}]]`;
                    await MarkdownRenderer.render(this.ntb.app, embedMd, containerEl, this.contextPath, this.component);
                };
            }
            catch (error) {
                new Notice(error instanceof Error ? error.message : String(error)).containerEl.addClass('mod-warning');
            }
        }

        // set focus in modal
        this.contentEl.tabIndex = 1;
        window.setTimeout(() => {
            this.contentEl.focus();
        }, 50);

    }

    displayEditor() {
        this.open();
    }

    displayWebpage() {
        this.open();
    }

}
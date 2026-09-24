import NoteToolbarPlugin from "main";
import { ItemView, MarkdownRenderer, TFile, WorkspaceLeaf } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbSidebarOptions } from "./INoteToolbarApi";

/**
 * Provides a sidebar view that can be accessed from the Note Toolbar API.
 */
export class NtbSidebarView extends ItemView {

    public static VIEW_TYPE_SIDEBAR = 'note-toolbar-sidebar';

    private viewIcon: string;
    private viewTitle: string;
    
    private clickHandlerRegistered: boolean = false;

    constructor(
        private ntb: NoteToolbarPlugin, 
        leaf: WorkspaceLeaf, 
        options?: NtbSidebarOptions) 
    {
        super(leaf);
        this.viewIcon = options?.viewIcon ?? 'file';
        this.viewTitle = options?.viewTitle ?? t('plugin.note-toolbar');
    }

    getViewType(): string {
        return NtbSidebarView.VIEW_TYPE_SIDEBAR;
    }

    getDisplayText(): string {
        return this.viewTitle;
    }

    getIcon(): string {
        return this.viewIcon;
    }

    async setContent(content: string | TFile): Promise<void> {
        this.contentEl.empty();

        const markdown = content instanceof TFile
            ? await this.app.vault.cachedRead(content)
            : content;

        const sourcePath = content instanceof TFile
            ? content.path
            : '';

        await MarkdownRenderer.render(
            this.app,
            markdown,
            this.contentEl,
            sourcePath,
            this
        );

        // this.contentEl.querySelectorAll<HTMLAnchorElement>('a.internal-link, a.external-link').forEach((link) => {
        //     link.tabIndex = 1;
        // });

        // make internal links clickable
        if (!this.clickHandlerRegistered) {
            this.ntb.registerDomEvent(this.contentEl, 'click', async (event) => {
                const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a.internal-link');
                if (!link) return;
    
                event.preventDefault();
    
                const target = link.getAttribute('href');
                if (target) await this.ntb.app.workspace.openLinkText(target, '', true);
            });
            this.clickHandlerRegistered = true;
        }

    }

    async onOpen(): Promise<void> {}

    async onClose(): Promise<void> {}
}
import NoteToolbarPlugin from "main";
import { ItemView, MarkdownRenderer, TFile, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbSidebarOptions } from "./INoteToolbarApi";

export interface NtbSidebarViewState {
    content: string | TFile;
    id: string;
}

/**
 * Provides a sidebar view that can be accessed from the Note Toolbar API.
 */
export class NtbSidebarView extends ItemView {

    public static VIEW_TYPE_SIDEBAR = 'note-toolbar-sidebar';

    state!: NtbSidebarViewState;

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

    getState(): Record<string, unknown> {
        return this.state as unknown as Record<string, unknown>;
    }

    /**
     * Appends string content to the sidebar, with newlines.
     * @param content string to append
     */
    async append(content: string, separator: string): Promise<void> {
        if (this.state.content instanceof TFile) return;
        
        const separatorText = this.state.content ? separator : '';
        this.state.content += separatorText + content;
        await this.renderContent(separatorText + content);
    }

    /**
     * Empties the sidebar's content.
     */
    clear(): void {
        this.contentEl.empty();
        this.state.content = '';
    }

    async renderContent(content: string | TFile): Promise<void> {

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
    
    async setState(state: NtbSidebarViewState, _result: ViewStateResult): Promise<void> {
        this.state = state;
        await this.renderContent(this.state.content);
    }

    async onOpen(): Promise<void> {}

    async onClose(): Promise<void> {}
}
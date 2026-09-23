import { ItemView, MarkdownRenderer, TFile, WorkspaceLeaf } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";

/**
 * Provides a sidebar view that can be accessed from the Note Toolbar API.
 */
export class NtbSidebarView extends ItemView {

    public static VIEW_TYPE_SIDEBAR = 'note-toolbar-sidebar';
    private viewTitle: string = t('plugin.note-toolbar');

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.viewTitle = t('plugin.note-toolbar');
    }

    getViewType(): string {
        return NtbSidebarView.VIEW_TYPE_SIDEBAR;
    }

    getDisplayText(): string {
        return this.viewTitle;
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
    }

    async onOpen(): Promise<void> {}

    async onClose(): Promise<void> {}
}
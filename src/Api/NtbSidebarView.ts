import NoteToolbarPlugin from "main";
import { ItemView, MarkdownRenderer, setIcon, TFile, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbSidebarOptions } from "./INoteToolbarApi";

export interface NtbSidebarViewState {
    content: string | TFile;
    id: string;
    navigation: boolean;
    viewIcon: string;
    viewTitle: string;
}

/**
 * Provides a sidebar view that can be accessed from the Note Toolbar API.
 */
export class NtbSidebarView extends ItemView {

    public static VIEW_TYPE_SIDEBAR = 'note-toolbar-sidebar';

    state!: NtbSidebarViewState;

    private clickHandlerRegistered: boolean = false;
    private navigationRendered: boolean = false;

    constructor(
        private ntb: NoteToolbarPlugin, 
        leaf: WorkspaceLeaf, 
        options?: NtbSidebarOptions) 
    {
        super(leaf);
    }

    getViewType(): string {
        return NtbSidebarView.VIEW_TYPE_SIDEBAR;
    }

    getDisplayText(): string {
        return this.state?.viewTitle ?? t('plugin.note-toolbar');
    }

    getIcon(): string {
        return this.state?.viewIcon ?? 'file';
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
        await this.renderContent(separatorText + content);
    }

    /**
     * Empties the sidebar's content.
     */
    clear(): void {
        this.contentEl.empty();
        this.state.content = '';

        // set empty state
        const emptyEl = this.contentEl.createDiv('pane-empty');
        emptyEl.setText(t('api.ui.sidebar-empty'));
    }

    async render(): Promise<void> {
        if (this.state.navigation) this.renderNavigation();
        await this.renderContent(this.state.content);
    }

    private async renderContent(content: string | TFile): Promise<void> {

        // remove empty state
        const emptyEl = this.contentEl.querySelector('.pane-empty');
        emptyEl?.remove();

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

        // scroll to make sure new content is in view
        this.contentEl.scrollTop = this.contentEl.scrollHeight;

    }

    private renderNavigation(): void {
        // make sure it's only rendered once
        if (this.navigationRendered) return;

        const navHeaderEl = createDiv('nav-header');
        const navButtonsEl = navHeaderEl.createDiv('nav-buttons-container');

        const addNavButton = (
            icon: string,
            label: string,
            callback: () => void
        ): void => {
            const button = navButtonsEl.createDiv({
                cls: ['clickable-icon', 'nav-action-button']
            });
            setIcon(button, icon);
            button.ariaLabel = label;
            this.ntb.registerDomEvent(button, 'click', callback);
        };

        addNavButton('eraser', t('api.ui.sidebar-clear'), () => this.clear());
        addNavButton('x', t('api.ui.sidebar-close'), () => this.leaf.detach());

        this.containerEl.insertAdjacentElement('afterbegin', navHeaderEl);

        this.navigationRendered = true;
    }

    async setState(state: NtbSidebarViewState, _result: ViewStateResult): Promise<void> {
        this.state = state;
        await this.render();
    }

    async onOpen(): Promise<void> {}

    async onClose(): Promise<void> {}

}
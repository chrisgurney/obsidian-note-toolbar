import NoteToolbarPlugin from "main";
import { ItemView, MarkdownRenderer, normalizePath, Notice, setIcon, TFile, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { NtbSidebarCustomButtonCallback, NtbSidebarOptions } from "./INoteToolbarApi";

/**
 * Serializable form of a sidebar navigation entry, as stored in view state.
 * Built-in buttons are stored by name. Custom buttons store only their icon and
 * tooltip; their `onClick` callback cannot be stored here and lives in the API
 * registry for the current session instead.
 */
export type NtbSidebarNavigation = 'clear' | 'close' | 'export' | { icon: string; tooltip: string };

export interface NtbSidebarViewState {
    content: string | TFile;
    class: string;
    id: string;
    navigation: NtbSidebarNavigation[];
    viewIcon: string;
    viewTitle: string;
}

/**
 * Provides a sidebar view that can be accessed from the Note Toolbar API.
 */
export class NtbSidebarView extends ItemView {

    public static VIEW_TYPE_SIDEBAR = 'note-toolbar-sidebar';
    public static NTB_ERROR_SIDEBAR = 'ntb-errors';

    state!: NtbSidebarViewState;

    private clickHandlerRegistered: boolean = false;
    private navigationRendered: boolean = false;

    constructor(
        private ntb: NoteToolbarPlugin, 
        leaf: WorkspaceLeaf, 
        options?: NtbSidebarOptions,
        private customButtons?: {
            get: (id: string, index: number) => NtbSidebarCustomButtonCallback | undefined;
            remove: (id: string) => void;
        }) 
    {
        super(leaf);
    }

    getViewType(): string {
        return NtbSidebarView.VIEW_TYPE_SIDEBAR;
    }

    getDisplayText(): string {
        return this.state?.viewTitle;
    }

    getIcon(): string {
        return this.state?.viewIcon;
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
        const appendedContent = separatorText + content;

        this.state.content += appendedContent;
        await this.renderContent(appendedContent);
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
        if (this.state.class) {
            this.containerEl.addClasses(this.state.class.split(' '));
        }
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

    /**
     * Adds navigation (clear/close) to the top of the sidebar view.
     */
    private renderNavigation(): void {
        // make sure it's only rendered once
        if (this.navigationRendered || !this.state.navigation.length) return;

        const navHeaderEl = createDiv('nav-header');
        const navButtonsEl = navHeaderEl.createDiv('nav-buttons-container');

        const addNavButton = (
            icon: string,
            label: string,
            callback: () => void | Promise<void>
        ): void => {
            const button = navButtonsEl.createDiv({
                cls: ['clickable-icon', 'nav-action-button']
            });
            setIcon(button, icon);
            button.ariaLabel = label;
            this.ntb.registerDomEvent(button, 'click', callback);
        };

        // position of the next custom button among the custom buttons only,
        // used to look up its callback in the registry
        let customIndex = 0;

        for (const option of this.state.navigation) {
            if (typeof option === 'string') {
                switch (option) {
                    case 'clear':
                        addNavButton('eraser', t('api.ui.sidebar-clear'), () => this.clear());
                        break;
                    case 'close':
                        addNavButton('x', t('api.ui.sidebar-close'), () => this.leaf.detach());
                        break;
                    case 'export':
                        addNavButton('file-down', t('api.ui.sidebar-export'), async () => await this.exportContents());
                        break;
                }
            } else {
                // custom button: omit it when its callback is not registered, for
                // example when the view was restored after a restart and no script
                // has re-run the ntb.sidebar() call yet
                const callback = this.customButtons?.get(this.state.id, customIndex);
                customIndex++;
                if (!callback) continue;

                const { icon, tooltip } = option;
                addNavButton(icon, tooltip, async () => {
                    try {
                        await callback({ content: this.state.content, view: this });
                    } catch (error) {
                        console.error('Note Toolbar: sidebar button failed.', error);
                    }
                });
            }
        }

        this.containerEl.insertAdjacentElement('afterbegin', navHeaderEl);

        this.navigationRendered = true;
    }

    async setState(state: NtbSidebarViewState, _result: ViewStateResult): Promise<void> {
        this.state = state;
        await this.render();
    }

    async onOpen(): Promise<void> {}

    onClose(): Promise<void> {
        // drop this sidebar's custom button callbacks, so they do not keep the
        // variables they close over in memory after the sidebar is closed
        if (this.state?.id) {
            this.customButtons?.remove(this.state.id);
        }
        return Promise.resolve();
    }

    /*************************************************************************
     * HELPERS
     *************************************************************************/

    /**
     * Exports the sidebar's contents to a Markdown file, prompting for a filename.
     */
    private async exportContents(): Promise<void> {
        const { content } = this.state;

        const text = typeof content === 'string'
            ? content
            : content instanceof TFile
                ? await this.ntb.app.vault.read(content)
                : null;

        if (text === null) {
            new Notice(t('api.ui.error-export-no-contents'));
            return;
        }

        const filename = await this.ntb.api.prompt({
            label: t('api.ui.prompt-label-file'),
            default: t('api.ui.prompt-placeholder-sidebar-export', { filename: `${window.moment().format('YYYY-MM-DD HH-mm-ss')}.md` })
        });
        if (!filename) return;

        const path = normalizePath(filename.endsWith('.md') ? filename : `${filename}.md`);
        const file = await this.ntb.app.vault.create(path, text);

        new Notice(t('api.msg.file-created', { filename: file.path }));
    }

    /**
     * Checks if the provided NtbSidebarView leaf matches the provided ID.
     * @param leaf leaf to check
     * @param id ID to compare against
     * @returns true if it has the ID; false otherwise
     */
    static hasId(leaf: WorkspaceLeaf, id: string): boolean {
        const state = leaf.getViewState().state;
        return typeof state === 'object' &&
            state !== null &&
            'id' in state &&
            state.id === id;
    }

    /**
     * Removes all NtbSidebarViews with an optional provided ID.
     * @param ntb plugin instance
     * @param id optional NtbSidebarView ID
     */
    static removeSidebars(ntb: NoteToolbarPlugin, id?: string): void {
        ntb.app.workspace
            .getLeavesOfType(NtbSidebarView.VIEW_TYPE_SIDEBAR)
            .filter(leaf => !id || NtbSidebarView.hasId(leaf, id))
            .forEach(leaf => leaf.detach());
    }

}
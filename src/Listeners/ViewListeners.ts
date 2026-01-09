import NoteToolbarPlugin from "main";
import { ItemView, MarkdownView, Platform } from "obsidian";


export default class ViewListeners {

    // we only need to listen to one scroll container at a time
    private scrollContainer: HTMLElement | null = null;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    public register() {
        // setup scroll listener for the active view
        const activeView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        if (activeView && this.ntb.utils.checkToolbarForItemView(activeView)) {
            this.setupScrollListener(activeView);
        }
    }

    /**
     * Updates the position of the floating toolbar, if there is one.
     */ 
    onScroll = () => {
        if (this.ntb.render.hasFloatingToolbar()) {
            // places the toolbar near the cursor (which takes text selection into account)
            const cursorPos = this.ntb.utils.getPosition('cursor');
            if (!cursorPos) return;
            this.ntb.render.positionFloating(this.ntb.render.floatingToolbarEl, cursorPos, Platform.isAndroidApp ? 'below' : 'above');
        }
    }

    /**
     * Listens to changes on scroll using {@link onScroll}.
     */
    private setupScrollListener(view: ItemView): void {
        // remove existing
        if (this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this.onScroll);
            this.scrollContainer = null;
        }

        // get the scrollable container based on view type
        this.scrollContainer = this.getScrollContainer(view);
        if (!this.scrollContainer) {
            this.ntb.debug('⚠️ No scroll container found for this view type');
            return;
        }

        // add scroll listener
        this.ntb.registerDomEvent(this.scrollContainer, 'scroll', this.onScroll);
    }

    /**
     * Get the scrollable container based on the view type.
     */
    private getScrollContainer(view: ItemView): HTMLElement | null {
        const viewType = view.getViewType();
        const containerEl = view.containerEl;
        
        let scrollEl: HTMLElement | null = null;
        
        switch (viewType) {
            case 'markdown': {
                scrollEl = (view as MarkdownView).getMode() === 'preview' 
                    ? containerEl.querySelector('.markdown-reading-view .markdown-preview-view') as HTMLElement
                    : containerEl.querySelector('.cm-scroller') as HTMLElement;
                break;
            }
            default:
                // do nothing
        }
        
        return scrollEl;
    }

}
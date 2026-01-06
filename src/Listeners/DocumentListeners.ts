import NoteToolbarPlugin from "main";
import { ItemView, MarkdownView, Platform, WorkspaceLeaf } from "obsidian";
import { PositionType } from "Settings/NoteToolbarSettings";


export default class DocumentListeners {

    public isContextOpening: boolean = false;
    public isKeyboardSelection: boolean = false;
    public isMouseDown: boolean = false;
    public isMouseSelecting: boolean = false;

	// for tracking current pointer position, for placing UI
	public pointerX: number = 0;
	public pointerY: number = 0;

    // we only need to listen to one scroll container at a time
    private scrollContainer: HTMLElement | null = null;

    private previewSelection: Selection | null = null;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    public register() {
        this.ntb.registerDomEvent(activeDocument, 'contextmenu', this.onContextMenu);
        this.ntb.registerDomEvent(activeDocument, 'dblclick', this.onDoubleClick);
        this.ntb.registerDomEvent(activeDocument, 'keydown', this.onKeyDown);
        this.ntb.registerDomEvent(activeDocument, 'mousemove', this.onMouseMove);
        this.ntb.registerDomEvent(activeDocument, 'mouseup', this.onMouseUp);
        this.ntb.registerDomEvent(activeDocument, 'mousedown', this.onMouseDown);
        this.ntb.registerDomEvent(activeDocument, 'selectionchange', this.onSelection);

        // setup initial scroll listener; subsequently done in onLeafChange
        const activeView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        if (activeView && this.ntb.utils.checkToolbarForItemView(activeView)) {
            this.setupScrollListener(activeView.leaf);
        }
    }
    
    /**
     * Listens to changes on scroll using {@link onScroll}.
     */
    public setupScrollListener(leaf: WorkspaceLeaf): void {
        // remove existing
        if (this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this.onScroll);
            this.scrollContainer = null;
        }

        // get the scrollable container based on view type
        this.scrollContainer = this.getScrollContainer(leaf);
        if (!this.scrollContainer) {
            console.log('No scroll container found for this view type');
            return;
        }

        // add scroll listener
        this.ntb.registerDomEvent(this.scrollContainer, 'scroll', this.onScroll);
    }

    onContextMenu = () => {
        this.isContextOpening = true;
    }

    onDoubleClick = async (event: MouseEvent) => {
        // possible issue? not always true?
        this.isMouseSelecting = true;
        this.renderPreviewTextToolbar();
    }

    onKeyDown = (event: KeyboardEvent) => {
        this.isKeyboardSelection = true;
        this.isMouseSelecting = false;
        this.isMouseDown = false; 
    }
    
    onMouseDown = (event: MouseEvent) => {
        this.ntb.debug('onMouseDown', event.target);
        this.isKeyboardSelection = false;
        this.isMouseDown = true;
        // TODO? dismiss floating toolbar if click is not inside a floating toolbar? (or its menus, etc?)
        // const clickTarget = event.target as Node;
        // const toolbarEl = this.ntb.render.floatingToolbarEl;
        if (!this.ntb.render.floatingToolbarEl?.contains(event.target as Node)) {
            this.ntb.render.removeFloatingToolbar();
        }
    }

    /**
     * To track mouse position.
     */
    onMouseMove = (event: MouseEvent) => {
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        if (this.isMouseDown) {
            this.isKeyboardSelection = false;
            this.isMouseSelecting = true;
        }
    }

    /**
     * We listen on the document to catch mouse releases outside of the editor as well.
     */
    onMouseUp = async (event: MouseEvent) => {
        this.ntb.debug('onMouseUp');
        this.isMouseDown = false;
        if (this.ntb.settings.textToolbar && this.previewSelection) {
            // selectionchange event is asynchronous and might not fire before mouseup
            // a small delay should ensure selectionchange has processed
            if (this.isMouseSelecting) setTimeout(() => this.renderPreviewTextToolbar(), 10);
        }
        this.isMouseSelecting = false;
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
     * Track any document selections, but only for Preview mode.
     */
    onSelection = (event: any) => {
        this.ntb.debug('onSelection');
        this.updatePreviewSelection();
    }

    /**
     * Get the scrollable container based on the view type.
     */
    private getScrollContainer(leaf: WorkspaceLeaf): HTMLElement | null {
        const activeView = leaf.view;
        const viewType = activeView.getViewType();
        const containerEl = leaf.view.containerEl;
        
        let scrollEl: HTMLElement | null = null;
        
        switch (viewType) {
            case 'markdown': {
                scrollEl = containerEl.querySelector('.cm-scroller');
                // reading mode fallback
                if (!scrollEl) scrollEl = containerEl.querySelector('.markdown-preview-view');
                break;
            }
            // TODO: check setting if toolbars are to be shown for other types
            // case 'canvas': {
            //     scrollEl = containerEl.querySelector('.canvas-wrapper');
            //     break;
            // }
            // case 'pdf': {
            //     scrollEl = containerEl.querySelector('.pdf-container');
            //     break;
            // }
            default: {
                // do nothing
                // TODO: needed? generic fallback - look for common scrollable containers
                // scrollEl = containerEl.querySelector('.view-content') ||
                //           containerEl.querySelector('.workspace-leaf-content') ||
                //           containerEl;                
            }
        }
        
        return scrollEl;
    }

    /**
     * Show text toolbar for selection in Preview mode.
     */
    private async renderPreviewTextToolbar() {
        if (this.ntb.settings.textToolbar && this.previewSelection) {
            this.ntb.debug('renderPreviewTextToolbar', this.previewSelection.toString());
            const textToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.textToolbar);
            if (textToolbar) {
                const cursorPos = this.ntb.utils.getPosition('cursor');
                await this.ntb.render.renderFloatingToolbar(textToolbar, cursorPos, PositionType.Text);
            }
        }
    }

    private updatePreviewSelection() {
        const activeView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        const selection = (activeView instanceof MarkdownView && activeView.getMode() === 'preview')
            ? activeDocument.getSelection()
            : null;
        const hasSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0;
        this.previewSelection = hasSelection ? selection : null;
        // this.ntb.debug('updatePreviewSelection', this.previewSelection?.toString());
    }

}
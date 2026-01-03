import NoteToolbarPlugin from "main";
import { ItemView, Platform, WorkspaceLeaf } from "obsidian";


export default class DocumentListeners {

    public isContextOpening: boolean = false;
    public isMouseDown: boolean = false;
    public isMouseSelection: boolean = false;

	// for tracking current pointer position, for placing UI
	public pointerX: number = 0;
	public pointerY: number = 0;

    // we only need to listen to one scroll container at a time
    private scrollContainer: HTMLElement | null = null;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    register() {
        this.ntb.registerDomEvent(activeDocument, 'contextmenu', this.onContextMenu);
        this.ntb.registerDomEvent(activeDocument, 'dblclick', this.onDoubleClick);
        this.ntb.registerDomEvent(activeDocument, 'keydown', this.onKeyDown);
        this.ntb.registerDomEvent(activeDocument, 'mousedown', this.onMouseDown);
        // to track mouse position
        this.ntb.registerDomEvent(activeDocument, 'mousemove', this.onMouseMove);
        // listen on the document to catch mouse releases outside of the editor
        this.ntb.registerDomEvent(activeDocument, 'mouseup', this.onMouseUp);

        // setup initial scroll listener; subsequently done in onLeafChange
        const activeView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        if (activeView && this.ntb.utils.checkToolbarForItemView(activeView)) {
            this.setupScrollListener(activeView.leaf);
        }
    }
    
    onContextMenu = () => {
        this.isContextOpening = true;
    }

    onDoubleClick = (event: MouseEvent) => {
        // possible issue? not always true?
        this.isMouseSelection = true;
    }

    onKeyDown = (event: KeyboardEvent) => {
        this.isMouseSelection = false;
        this.isMouseDown = false;        
    }
    
    onMouseDown = (event: MouseEvent) => {
        this.isMouseDown = true;
    }

    onMouseMove = (event: MouseEvent) => {
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        if (this.isMouseDown) {
            this.isMouseSelection = true;
        }
    }

    onMouseUp = (event: MouseEvent) => {
        this.isMouseDown = false;
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
     * Listens to changes on scroll using {@link onScroll}.
     * 
     * @param leaf 
     * @returns 
     */
    public setupScrollListener(leaf: WorkspaceLeaf): void {
        // remove existing
        if (this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this.onScroll);
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

}
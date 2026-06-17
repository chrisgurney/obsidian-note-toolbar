import NoteToolbarPlugin from "main";
import { Platform } from "obsidian";
import { PositionType } from "Settings/NoteToolbarSettings";


export default class DocumentListeners {

    public isContextOpening: boolean = false;
    public isKeyboardSelection: boolean = false;
    public isPointerDown: boolean = false;
    public isPointerSelecting: boolean = false;

	// for tracking current pointer position, for placing UI
	public pointerX: number = 0;
	public pointerY: number = 0;

    private previewSelection: Selection | null = null;
    private sidebarObserver: MutationObserver | null = null;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    public register() {
        this.ntb.registerDomEvent(activeDocument, 'contextmenu', this.onContextMenu);
        this.ntb.registerDomEvent(activeDocument, 'dblclick', this.onDoubleClick);
        this.ntb.registerDomEvent(activeDocument, 'keydown', this.onKeyDown);
        this.ntb.registerDomEvent(activeDocument, 'pointercancel', this.onPointerCancel);
        this.ntb.registerDomEvent(activeDocument, 'pointerdown', this.onPointerDown);
        this.ntb.registerDomEvent(activeDocument, 'pointermove', this.onPointerMove);
        this.ntb.registerDomEvent(activeDocument, 'pointerup', this.onPointerUp);
        this.ntb.registerDomEvent(activeDocument, 'selectionchange', this.onSelectionChange);

        // track whether sidebar is open on phones, for styling purposes
        if (Platform.isPhone) {
            const workspaceEl = this.ntb.app.workspace.containerEl.closest('.workspace');
            if (workspaceEl) {
                this.sidebarObserver = new MutationObserver(() => {
                    const isOpen = workspaceEl?.classList.contains('is-left-sidedock-open') 
                        || workspaceEl?.classList.contains('is-right-sidedock-open')
                        || false;
                    activeDocument.body.toggleClass('ntb-is-sidedock-open', isOpen);
                });
                this.sidebarObserver.observe(workspaceEl, { attributes: true, attributeFilter: ['class'] });
            }
        }

    }

    public cleanup() {
        this.sidebarObserver?.disconnect();
    }

    onContextMenu = () => {
        this.isContextOpening = true;
    }

    onDoubleClick = () => {
        // possible issue? not always true?
        this.isPointerSelecting = true;
        // timeout is because selectionchange event is asynchronous and might not fire before mouseup
        window.setTimeout(() => void this.renderPreviewTextToolbar(), 10);
    }

    onKeyDown = (event: KeyboardEvent) => {
        this.isKeyboardSelection = true;
        this.isPointerSelecting = false;
        this.isPointerDown = false;
        if (event.key === 'Escape' && this.ntb.render.hasFloatingToolbar()) {
            this.ntb.render.removeFloatingToolbar();
        }
    }
    
    onPointerCancel = () => {
        this.isPointerDown = false;
        this.isPointerSelecting = false;
    };

    onPointerDown = (event: PointerEvent) => {
        // prevent phone Navbar from appearing when tapping items, for bottom toolbars
        if (Platform.isPhone && this.ntb.render.phoneTbarPosition === PositionType.Bottom) {
            const target = event.target as HTMLElement;
            const isToolbar = (target.closest('.cg-note-toolbar-container') !== null);
            if (isToolbar) event.stopPropagation();
        }
        this.isKeyboardSelection = false;
        this.isPointerDown = true;
        // TODO? dismiss floating toolbar if click is not inside a floating toolbar? (or its menus, etc?)
        // const clickTarget = event.target as Node;
        // const toolbarEl = this.ntb.render.floatingToolbarEl;
        if (this.ntb.render.floatingToolbarEl && !this.ntb.render.floatingToolbarEl.contains(event.target as Node)) {
            this.ntb.render.removeFloatingToolbar();
        }
    }

    /**
     * To track pointer position.
     */
    onPointerMove = (event: PointerEvent) => {
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        if (this.isPointerDown) {
            this.isKeyboardSelection = false;
            this.isPointerSelecting = true;
        }
    }

    /**
     * We listen on the document to catch pointer releases outside of the editor as well.
     */
    onPointerUp = () => {
        // this.ntb.debug('onPointerUp');
        this.isPointerDown = false;
        if (this.ntb.settings.textToolbar && this.previewSelection) {
            // timeout is because selectionchange event is asynchronous and might not fire before mouseup
            if (this.isPointerSelecting) window.setTimeout(() => void this.renderPreviewTextToolbar(), 10);
        }
        this.isPointerSelecting = false;
    }

    /**
     * Track any document selections, but only for Preview mode.
     */
    onSelectionChange = () => {
        // this.ntb.debug('onSelectionChange', event);
        this.updatePreviewSelection();
    }

    /**
     * Show text toolbar for selection in Preview mode.
     */
    private async renderPreviewTextToolbar() {
        if (this.ntb.settings.textToolbar && this.previewSelection) {
            // this.ntb.debug('renderPreviewTextToolbar', this.previewSelection.toString());
            const textToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.textToolbar);
            if (textToolbar) {
                this.ntb.debug('🎨 DocumentListeners: Rendering text toolbar', textToolbar.name);
                const cursorPos = this.ntb.utils.getPosition('cursor');
                await this.ntb.render.renderFloatingToolbar(textToolbar, cursorPos, PositionType.Text);
            }
        }
    }

    /**
     * Updates local variable with any text that is selected within either Preview mode or within a markdown embed.
     */
    private updatePreviewSelection() {
        const selectedText = this.ntb.utils.getSelection(true); // only get text for preview mode/embeds
        const selection = activeDocument.getSelection();
        const hasSelection = selectedText && selection && !selection.isCollapsed;
        this.previewSelection = hasSelection ? selection : null;
    }

}
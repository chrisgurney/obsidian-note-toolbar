import NoteToolbarPlugin from "main";
import { PositionType } from "Settings/NoteToolbarSettings";


export default class DocumentListeners {

    public isContextOpening: boolean = false;
    public isKeyboardSelection: boolean = false;
    public isMouseDown: boolean = false;
    public isMouseSelecting: boolean = false;

	// for tracking current pointer position, for placing UI
	public pointerX: number = 0;
	public pointerY: number = 0;

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
        this.ntb.registerDomEvent(activeDocument, 'selectionchange', this.onSelectionChange);
    }

    onContextMenu = () => {
        this.isContextOpening = true;
    }

    onDoubleClick = async (event: MouseEvent) => {
        // possible issue? not always true?
        this.isMouseSelecting = true;
        // timeout is because selectionchange event is asynchronous and might not fire before mouseup
        setTimeout(() => this.renderPreviewTextToolbar(), 10);
    }

    onKeyDown = (event: KeyboardEvent) => {
        this.isKeyboardSelection = true;
        this.isMouseSelecting = false;
        this.isMouseDown = false;
        if (event.key === 'Escape' && this.ntb.render.hasFloatingToolbar()) {
            this.ntb.render.removeFloatingToolbar();
        }
    }
    
    onMouseDown = (event: MouseEvent) => {
        // this.ntb.debug('onMouseDown', event.target);
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
        // this.ntb.debug('onMouseUp');
        this.isMouseDown = false;
        if (this.ntb.settings.textToolbar && this.previewSelection) {
            // timeout is because selectionchange event is asynchronous and might not fire before mouseup
            if (this.isMouseSelecting) setTimeout(() => this.renderPreviewTextToolbar(), 10);
        }
        this.isMouseSelecting = false;
    }

    /**
     * Track any document selections, but only for Preview mode.
     */
    onSelectionChange = (event: any) => {
        // this.ntb.debug('onSelection');
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
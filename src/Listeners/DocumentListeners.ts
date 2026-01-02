import NoteToolbarPlugin from "main";


export default class DocumentListeners {

    public isContextOpening: boolean = false;
    public isMouseDown: boolean = false;
    public isMouseSelection: boolean = false;

	// for tracking current pointer position, for placing UI
	public pointerX: number = 0;
	public pointerY: number = 0;

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

}
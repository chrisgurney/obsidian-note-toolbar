import { EditorView } from "@codemirror/view";
import NoteToolbarPlugin from "main";


export default class ViewListeners {

    public isContextOpening: boolean = false;
    public isMouseDown: boolean = false;
    public isMouseSelection: boolean = false;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    register() {
        // to track mouse position
        this.ntb.registerDomEvent(activeDocument, 'mousemove', this.onMouseMove);
        // listen on the document to catch mouse releases outside of the editor
        this.ntb.registerDomEvent(activeDocument, 'mouseup', this.onMouseUp);
    }
    
    registerForView(view: EditorView) {
        this.ntb.registerDomEvent(view.dom, 'contextmenu', this.onContextMenu); 
        this.ntb.registerDomEvent(view.dom, 'dblclick', this.onDoubleClick);        
        this.ntb.registerDomEvent(view.dom, 'keydown', this.onKeyDown);
        this.ntb.registerDomEvent(view.dom, 'mousedown', this.onMouseDown);
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
        this.ntb.render.pointerX = event.clientX;
        this.ntb.render.pointerY = event.clientY;
        if (this.isMouseDown) {
            this.isMouseSelection = true;
        }
    }

    onMouseUp = (event: MouseEvent) => {
        this.isMouseDown = false;
    }

}
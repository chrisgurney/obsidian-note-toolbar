import NoteToolbarPlugin from "main";


export default class ViewListeners {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    onMouseMove = (event: MouseEvent) => {
        this.ntb.render.pointerX = event.clientX;
        this.ntb.render.pointerY = event.clientY;
    }

}
import NoteToolbarPlugin from "main";
import { Platform } from "obsidian";


export default class WindowListeners {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    public register() {
        if (Platform.isPhone) {
            window.addEventListener('keyboardWillHide', this.onKeyboardHide);
            window.addEventListener('keyboardWillShow', this.onKeyboardShow);
        }
    }

    /**
     * Removes a class from the body if the keyboard is showing, on phones.
     */
    onKeyboardHide = () => {
        // this.ntb.debug('window keyboardWillHide');
        activeDocument.body.classList.toggle('ntb-is-keyboard-open', false);
    }

    /**
     * Adds a class to the body if the keyboard is showing, on phones.
     */
    onKeyboardShow = () => {
        // this.ntb.debug('window keyboardWillShow');
        activeDocument.body.classList.toggle('ntb-is-keyboard-open', true);
    }

}
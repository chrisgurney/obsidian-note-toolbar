import NoteToolbarPlugin from "main";
import { Platform } from "obsidian";

/**
 * The slice of the plugin this class actually needs.
 *
 * Previously the constructor took the whole NoteToolbarPlugin (`ntb`),
 * even though the class only ever needed a way to register DOM events
 * that are automatically detached when the plugin unloads. Passing a
 * narrow Pick<> makes that dependency explicit, and lets this class be
 * constructed in tests with a stub that only provides registerDomEvent.
 *
 * NoteToolbarPlugin itself satisfies this type, so main.ts still just
 * passes `this`.
 */
type WindowListenersDeps = Pick<NoteToolbarPlugin, 'registerDomEvent'>;

export default class WindowListeners {

    constructor(
        private deps: WindowListenersDeps
    ) {}

    public register() {
        if (Platform.isPhone) {
            // registerDomEvent (vs. window.addEventListener) so both
            // listeners are automatically removed when the plugin unloads
            this.deps.registerDomEvent(window, 'keyboardWillHide', this.onKeyboardHide);
            this.deps.registerDomEvent(window, 'keyboardWillShow', this.onKeyboardShow);
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
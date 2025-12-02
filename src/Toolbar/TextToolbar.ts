import { EditorView, PluginValue, Rect, ViewPlugin, ViewUpdate } from '@codemirror/view';
import NoteToolbarPlugin from 'main';

/**
 * Renders the configured toolbar when text is selected.
 * @param ntb NoteToolbarPlugin
 * @returns ViewPlugin class to pass to `registerEditorExtension()`
 */
export default function TextToolbar(ntb: NoteToolbarPlugin): ViewPlugin<TextToolbarClass> {

    // wrapper so we can pass in the ntb reference
    class TextToolbarClassWithNtb extends TextToolbarClass {
        constructor(view: EditorView) {
            super(view, ntb);
        }
    }
    
    return ViewPlugin.fromClass(TextToolbarClassWithNtb);

}

class TextToolbarClass implements PluginValue {
    private isContextOpening: boolean = false;
    private isMouseDown: boolean = false;
    private isMouseSelection: boolean = false;
    private lastSelection: { from: number; to: number; text: string } | null = null;

    constructor(view: EditorView, private ntb: NoteToolbarPlugin) {
        // plugin.debug('TextToolbarView initialized');

        ntb.registerDomEvent(view.dom, 'mousedown', () => {
            this.isMouseDown = true;
        });
        ntb.registerDomEvent(view.dom, 'mousemove', () => {
            if (this.isMouseDown) {
                this.isMouseSelection = true;
            }
        });
        ntb.registerDomEvent(view.dom, 'mouseup', () => {
            this.isMouseDown = false;
        });
        // also listen to mouseup on the document to catch releases outside the editor
        ntb.registerDomEvent(activeDocument, 'mouseup', () => {
            this.isMouseDown = false;
        });
        ntb.registerDomEvent(view.dom, 'keydown', () => {
            this.isMouseSelection = false;
            this.isMouseDown = false;
        });
        ntb.registerDomEvent(view.dom, 'dblclick', () => {
            this.isMouseSelection = true;
        });
        ntb.registerDomEvent(view.scrollDOM, 'scroll', () => {
            if (ntb.render.hasTextToolbar()) {
                ntb.debug('⛔️ view scrolled - removing toolbar');
                ntb.render.removeTextToolbar();
            }
        });
        ntb.registerDomEvent(view.dom, 'contextmenu', () => {
            this.isContextOpening = true;
        });

    }

    update(update: ViewUpdate) {

        // if there's no text toolbar set, there's nothing to do
        if (!this.ntb.settings.textToolbar) {
            // plugin.debug('no text toolbar setting');
            if (this.ntb.render.hasTextToolbar()) this.ntb.render.removeTextToolbar();
            return;
        };
        
        // don't show toolbar until selection is complete
        if (this.isMouseDown) {
            // this.ntb.debug('mousedown - exiting');
            return;
        };

        const { state, view } = update;

        const selection = state.selection.main;
        const selectFrom = selection.from;
        const selectTo = selection.to;
        const selectText = state.doc.sliceString(selection.from, selection.to);
        // this.ntb.debug('selection:', selection);

        // right-clicking for some reason selects the current line if it's empty
        if (this.isContextOpening && selectTo === selectFrom + 1) {
            this.ntb.debug('⛔️ selection is just new line - exiting');
            this.isContextOpening = false;
            return;
        }

        if (!update.selectionSet) {
            if (this.ntb.render.isTextToolbarFocussed()) {
                this.ntb.debug('toolbar in focus - exiting');
                return;
            }
            if (selectFrom === selectTo || !view.hasFocus) {
                if (this.ntb.render.hasTextToolbar()) {
                    this.ntb.debugGroup('⛔️ no selection or view out of focus - removing toolbar');
                    this.ntb.debug(
                        'selection empty:', selectFrom === selectTo, ' • has focus: view', view.hasFocus, 'toolbar', 
                        this.ntb.render.isTextToolbarFocussed());
                    this.ntb.debugGroupEnd();
                    this.ntb.render.removeTextToolbar();
                }
                return;
            }
        };

        if (selection.empty) {
            this.lastSelection = null;
            if (this.ntb.render.hasTextToolbar()) {
                this.ntb.debug('⛔️ selection empty - removing toolbar');
                this.ntb.render.removeTextToolbar();
            }
            return;
        }

        // if the selection hasn't changed, do nothing
        if (
            this.lastSelection &&
            this.lastSelection.from === selectFrom &&
            this.lastSelection.to === selectTo &&
            this.lastSelection.text === selectText
        ) {
            return;
        }

        requestAnimationFrame(async () => {

            const selectStartPos: Rect | null = view.coordsAtPos(selectFrom);
            const selectEndPos: Rect | null = view.coordsAtPos(selectTo);
            const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.textToolbar);
            await this.ntb.render.renderTextToolbar(toolbar, selectStartPos, selectEndPos);

            this.lastSelection = {
                from: selectFrom,
                to: selectTo,
                text: selectText
            };

            // TODO: do we need this?
            // if (!this.isMouseSelection) {
            //     this.isMouseDown = false;
            // }
            
        });

    }

    destroy() {
        if (this.ntb.render.hasTextToolbar()) this.ntb.render.removeTextToolbar();
    }

}
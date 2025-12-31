import { EditorView, PluginValue, Rect, ViewPlugin, ViewUpdate } from '@codemirror/view';
import NoteToolbarPlugin from 'main';
import { Notice, Platform } from 'obsidian';
import { t } from 'Settings/NoteToolbarSettings';

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

export class TextToolbarClass implements PluginValue {
    private isContextOpening: boolean = false;
    private isMouseDown: boolean = false;
    private isMouseSelection: boolean = false;

    private lastSelection: { from: number; to: number; text: string } | null = null;
    private selection: { from: number; to: number; text: string } | null = null;

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
            if (ntb.render.hasFloatingToolbar()) {
                if (!this.selection) return;
                const selectStartPos: Rect | null = view.coordsAtPos(this.selection.from);
                const selectEndPos: Rect | null = view.coordsAtPos(this.selection.to);
                if (!selectStartPos || !selectEndPos) return;
                ntb.render.positionFloating(ntb.render.floatingToolbarEl, selectStartPos, selectEndPos, Platform.isAndroidApp ? 'below' : 'above');
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
            if (this.ntb.render.hasFloatingToolbar()) this.ntb.render.removeFloatingToolbar();
            return;
        };
        
        // don't show toolbar until selection is complete
        if (this.isMouseDown) {
            // this.ntb.debug('mousedown - exiting');
            return;
        };

        const { state, view } = update;

        const selection = state.selection.main;
        this.selection = {
            from: selection.from,
            to: selection.to,
            text: state.doc.sliceString(selection.from, selection.to)
        };
        // this.ntb.debug('selection:', selection);

        // right-clicking for some reason selects the current line if it's empty
        if (this.isContextOpening && this.selection.from === this.selection.from + 1) {
            this.ntb.debug('⛔️ selection is just new line - exiting');
            this.isContextOpening = false;
            return;
        }

        if (!update.selectionSet) {
            if (this.ntb.render.isFloatingToolbarFocussed()) {
                this.ntb.debug('toolbar in focus - exiting');
                return;
            }
            if (this.selection.from === this.selection.to || !view.hasFocus) {
                if (this.ntb.render.hasFloatingToolbar()) {
                    this.ntb.debugGroup('⛔️ no selection or view out of focus - removing toolbar');
                    this.ntb.debug(
                        'selection empty:', this.selection.from === this.selection.to, ' • has focus: view', view.hasFocus, 'toolbar', 
                        this.ntb.render.isFloatingToolbarFocussed());
                    this.ntb.debugGroupEnd();
                    this.ntb.render.removeFloatingToolbar();
                }
                return;
            }
        };

        if (selection.empty) {
            this.lastSelection = null;
            if (this.ntb.render.hasFloatingToolbar()) {
                this.ntb.debug('⛔️ selection empty - removing toolbar');
                this.ntb.render.removeFloatingToolbar();
            }
            return;
        }

        // if the selection hasn't changed, do nothing
        if (
            this.lastSelection &&
            this.lastSelection.from === this.selection.from &&
            this.lastSelection.to === this.selection.to &&
            this.lastSelection.text === this.selection.text
        ) {
            return;
        }

        requestAnimationFrame(async () => {

            if (!this.selection) return;

            const selectStartPos: Rect | undefined = view.coordsAtPos(this.selection.from) ?? undefined;
            const selectEndPos: Rect | undefined = view.coordsAtPos(this.selection.to) ?? undefined;
            const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.textToolbar);
            if (!toolbar) {
                this.ntb.debug('⚠️ error: no text toolbar with ID', this.ntb.settings.textToolbar);
                new Notice(t('setting.error-invalid-text-toolbar'));
                return;
            };
            await this.ntb.render.renderFloatingToolbar(toolbar, selectStartPos, selectEndPos);

            this.lastSelection = {
                from: this.selection.from,
                to: this.selection.to,
                text: this.selection.text
            };

            // TODO: do we need this?
            // if (!this.isMouseSelection) {
            //     this.isMouseDown = false;
            // }
            
        });

    }

    destroy() {
        if (this.ntb.render.hasFloatingToolbar()) this.ntb.render.removeFloatingToolbar();
    }

}
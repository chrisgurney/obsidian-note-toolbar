import { EditorView, PluginValue, ViewUpdate, ViewPlugin, Rect } from '@codemirror/view';
import NoteToolbarPlugin from 'main';

export function TextToolbarView(ntb: NoteToolbarPlugin) {

    return ViewPlugin.fromClass(
        
        class implements PluginValue {
            private isMouseDown: boolean = false;
            private isMouseSelection: boolean = false;
            private lastSelection: { from: number; to: number; text: string } | null = null;

            constructor(view: EditorView) {
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
                ntb.registerDomEvent(view.dom, 'keydown', () => {
                    this.isMouseSelection = false;
                    this.isMouseDown = false;
                });
                ntb.registerDomEvent(view.dom, 'dblclick', () => {
                    this.isMouseSelection = true;
                });
                ntb.registerDomEvent(view.scrollDOM, 'scroll', () => {
                    if (ntb.textToolbarEl) {
                        ntb.debug('⛔️ view scrolled - removing toolbar');
                        ntb.textToolbarEl.remove();
                    }
                });
            }

            update(update: ViewUpdate) {

                // if there's no text toolbar set, there's nothing to do
                if (!ntb.settings.textToolbar) {
                    // plugin.debug('no text toolbar setting');
                    if (ntb.textToolbarEl) ntb.textToolbarEl.remove();
                    return;
                };
                
                // don't show toolbar until selection is complete
                if (this.isMouseDown) {
                    // plugin.debug('mousedown');
                    return;
                };

                const { state, view } = update;

                // const isToolbarFocussed = plugin.textToolbarEl && plugin.textToolbarEl.querySelector(`.${ToolbarStyle.ItemFocused}`) !== null;
                const isToolbarFocussed = ntb.textToolbarEl && ntb.textToolbarEl.contains(activeDocument.activeElement);

                const selection = state.selection.main;
                const selectFrom = selection.from;
                const selectTo = selection.to;
                const selectText = state.doc.sliceString(selection.from, selection.to);

                if (!update.selectionSet) {
                    if (isToolbarFocussed) {
                        ntb.debug('toolbar in focus - exiting');
                        return;
                    }
                    if (selectFrom === selectTo || !view.hasFocus) {
                        if (ntb.textToolbarEl) {
                            ntb.debug('⛔️ no selection or view out of focus - removing toolbar');
                            ntb.debug('selection empty:', selectFrom === selectTo, ' • has focus: view', view.hasFocus, 'toolbar', isToolbarFocussed);
                            ntb.textToolbarEl.remove();
                        }
                        return;
                    }
                };

                if (selection.empty) {
                    this.lastSelection = null;
                    if (ntb.textToolbarEl) {
                        ntb.debug('⛔️ selection empty - removing toolbar');
                        ntb.textToolbarEl.remove();
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
                    await ntb.renderTextToolbar(selectStartPos, selectEndPos);

                    // TODO: do we need this?
                    // if (!this.isMouseSelection) {
                    //     this.isMouseDown = false;
                    // }
                    
                });

            }

            destroy() {
                if (ntb.textToolbarEl) ntb.textToolbarEl.remove();
            }

        }

    );

}
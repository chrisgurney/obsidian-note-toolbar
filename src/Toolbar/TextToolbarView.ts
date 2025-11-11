import { EditorView, PluginValue, ViewUpdate, ViewPlugin, Rect } from '@codemirror/view';
import NoteToolbarPlugin from 'main';

export function TextToolbarView(plugin: NoteToolbarPlugin) {

    return ViewPlugin.fromClass(
        
        class implements PluginValue {
            private isMouseDown: boolean = false;
            private isMouseSelection: boolean = false;
            private lastSelection: { from: number; to: number; text: string } | null = null;

            constructor(view: EditorView) {
                // plugin.debug('TextToolbarView initialized');

                plugin.registerDomEvent(view.dom, 'mousedown', () => {
                    this.isMouseDown = true;
                });
                plugin.registerDomEvent(view.dom, 'mousemove', () => {
                    if (this.isMouseDown) {
                        this.isMouseSelection = true;
                    }
                });
                plugin.registerDomEvent(view.dom, 'mouseup', () => {
                    this.isMouseDown = false;
                });
                plugin.registerDomEvent(view.dom, 'keydown', () => {
                    this.isMouseSelection = false;
                    this.isMouseDown = false;
                });
                plugin.registerDomEvent(view.dom, 'dblclick', () => {
                    this.isMouseSelection = true;
                });
                plugin.registerDomEvent(view.scrollDOM, 'scroll', () => {
                    if (plugin.textToolbarEl) {
                        plugin.debug('⛔️ view scrolled - removing toolbar');
                        plugin.textToolbarEl.remove();
                    }
                });
            }

            update(update: ViewUpdate) {

                // if there's no text toolbar set, there's nothing to do
                if (!plugin.settings.textToolbar) {
                    // plugin.debug('no text toolbar setting');
                    if (plugin.textToolbarEl) plugin.textToolbarEl.remove();
                    return;
                };
                
                // don't show toolbar until selection is complete
                if (this.isMouseDown) {
                    // plugin.debug('mousedown');
                    return;
                };

                const { state, view } = update;

                // const isToolbarFocussed = plugin.textToolbarEl && plugin.textToolbarEl.querySelector(`.${ToolbarStyle.ItemFocused}`) !== null;
                const isToolbarFocussed = plugin.textToolbarEl && plugin.textToolbarEl.contains(activeDocument.activeElement);

                const selection = state.selection.main;
                const selectFrom = selection.from;
                const selectTo = selection.to;
                const selectText = state.doc.sliceString(selection.from, selection.to);

                if (!update.selectionSet) {
                    if (isToolbarFocussed) {
                        plugin.debug('toolbar in focus - exiting');
                        return;
                    }
                    if (selectFrom === selectTo || !view.hasFocus) {
                        if (plugin.textToolbarEl) {
                            plugin.debug('⛔️ no selection or view out of focus - removing toolbar');
                            plugin.debug('selection empty:', selectFrom === selectTo, ' • has focus: view', view.hasFocus, 'toolbar', isToolbarFocussed);
                            plugin.textToolbarEl.remove();
                        }
                        return;
                    }
                };

                if (selection.empty) {
                    this.lastSelection = null;
                    if (plugin.textToolbarEl) {
                        plugin.debug('⛔️ selection empty - removing toolbar');
                        plugin.textToolbarEl.remove();
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
                    await plugin.renderTextToolbar(selectStartPos, selectEndPos);

                    // TODO: do we need this?
                    // if (!this.isMouseSelection) {
                    //     this.isMouseDown = false;
                    // }
                    
                });

            }

            destroy() {
                if (plugin.textToolbarEl) plugin.textToolbarEl.remove();
            }

        }

    );

}
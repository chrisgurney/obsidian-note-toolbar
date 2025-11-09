import { EditorView, PluginValue, ViewUpdate, ViewPlugin, Rect } from '@codemirror/view';
import NoteToolbarPlugin from 'main';
import { MarkdownView } from 'obsidian';
import { PositionType, ToolbarStyle } from 'Settings/NoteToolbarSettings';

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

                // plugin.debug('Text selected:', selectFrom, selectTo, selectText);
                // plugin.debug('MouseDown', this.isMouseDown, 'MouseSelection', this.isMouseSelection);

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
                    await this.renderTextToolbar(selectStartPos, selectEndPos);

                    // TODO: do we need this?
                    // if (!this.isMouseSelection) {
                    //     this.isMouseDown = false;
                    // }
                    
                });

            }

            destroy() {
                if (plugin.textToolbarEl) plugin.textToolbarEl.remove();
                // plugin.debug('TextToolbarView destroyed');
            }

            private async renderTextToolbar(selectStartPos: Rect | null, selectEndPos: Rect | null) {

                if (!selectStartPos || !selectEndPos) return;
                
                const toolbar = plugin.settingsManager.getToolbarById(plugin.settings.textToolbar);
                if (!toolbar) {
                    // TODO: show an error if toolbar not found
                    return;
                };

                const activeFile = plugin.app.workspace.getActiveFile();
                const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
                if (!activeFile || !activeView) return;

                // remove the existing toolbar because we're likely in a new position
                if (plugin.textToolbarEl) {
                    plugin.debug('♻️ removing old toolbar - rendering new one');
                    plugin.textToolbarEl.remove();
                }

                plugin.textToolbarEl = activeDocument.createElement('div');
                plugin.textToolbarEl.id = toolbar.uuid;
                plugin.textToolbarEl.addClasses([
                    'cg-note-toolbar-container', 'cm-embed-block', 'cm-callout', 'cg-note-toolbar-bar-container'
                ]);
                plugin.textToolbarEl.setAttrs({
                    'data-name': toolbar.name,
                    'data-tbar-position': PositionType.Text,
                    'data-updated': toolbar.updated,
                    // 'data-view-mode': markdownViewMode,
                    'data-csstheme': plugin.app.vault.getConfig('cssTheme')
                });
                
                const renderedToolbarEl = await plugin.renderToolbarAsCallout(toolbar, activeFile, activeView);
                plugin.textToolbarEl.appendChild(renderedToolbarEl);
                activeDocument.body.appendChild(plugin.textToolbarEl);

                this.positionToolbar(selectStartPos, selectEndPos);

                plugin.registerDomEvent(plugin.textToolbarEl, 'contextmenu', (e) => plugin.toolbarContextMenuHandler(e));
                plugin.registerDomEvent(plugin.textToolbarEl, 'keydown', (e) => plugin.toolbarKeyboardHandler(e, true));

                // plugin.debug('drew toolbar');

                // TODO: need this for placing within modals?
                // const modalEl = activeDocument.querySelector('.modal-container .note-toolbar-ui') as HTMLElement;
                // position relative to modal container if in a modal
                // if (modalEl) modalEl.insertAdjacentElement('afterbegin', embedBlock)
                // else ...

            }

            /**
             * Positions the toolbar, ensuring it doesn't go over the edge of the window.
             * @param selectStartPos 
             * @param selectEndPos 
             * @returns nothing
             */
            private positionToolbar(selectStartPos: Rect, selectEndPos: Rect): void {

                if (!plugin.textToolbarEl) return;

                const centerX = (selectStartPos.left + selectEndPos.right) / 2;
                let left = centerX - (plugin.textToolbarEl.offsetWidth / 2);
                // TODO? make offset via CSS variable instead of subtracting here?
                let top = selectStartPos.top - plugin.textToolbarEl.offsetHeight - 8;

                // prevent horizontal overflow
                const minLeft = 8;
                const maxLeft = window.innerWidth - plugin.textToolbarEl.offsetWidth - 8;
                left = Math.max(minLeft, Math.min(left, maxLeft));

                // prevent vertical overflow
                if (top < 8) {
                    // try below selection
                    top = selectEndPos.bottom + 8;
                    
                    // if still overflows below, clamp to bottom
                    if (top + plugin.textToolbarEl.offsetHeight > window.innerHeight - 8) {
                        top = window.innerHeight - plugin.textToolbarEl.offsetHeight - 8;
                    }
                }

                plugin.textToolbarEl.style.left = `${left}px`;
                plugin.textToolbarEl.style.top = `${top}px`;
                
            }

        }

    );

}
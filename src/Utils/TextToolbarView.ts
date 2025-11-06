import { EditorView, PluginValue, ViewUpdate, ViewPlugin, Rect } from '@codemirror/view';
import NoteToolbarPlugin from 'main';
import { MarkdownView } from 'obsidian';
import { PositionType } from 'Settings/NoteToolbarSettings';

export function TextToolbarView(plugin: NoteToolbarPlugin) {

    return ViewPlugin.fromClass(
        
        class implements PluginValue {
            private isMouseDown: boolean = false;
            private isMouseSelection: boolean = false;
            private lastSelection: { from: number; to: number; text: string } | null = null;
            private toolbarEl: HTMLDivElement | null = null;

            constructor(view: EditorView) {
                plugin.debug('TextToolbarView initialized');

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
            }

            update(update: ViewUpdate) {

                // if there's no text toolbar set, there's nothing to do
                if (!plugin.settings.textToolbar) {
                    if (this.toolbarEl) this.toolbarEl.remove();
                    return;
                };

                // defer layout calculation
                requestAnimationFrame(async () => {

                    const selection = update.state.selection.main;

                    if (!update.selectionSet || selection.empty) {
                        this.lastSelection = null;
                        if (this.toolbarEl) this.toolbarEl.remove();
                        return;
                    }

                    const selectFrom = selection.from;
                    const selectTo = selection.to;
                    const selectText = update.state.doc.sliceString(selection.from, selection.to);

                    plugin.debug('Text selected:', selectFrom, selectTo, selectText);
                    plugin.debug('MouseDown', this.isMouseDown, 'MouseSelection', this.isMouseSelection);

                    // if the selection hasn't changed, do nothing
                    if (
                        this.lastSelection &&
                        this.lastSelection.from === selectFrom &&
                        this.lastSelection.to === selectTo &&
                        this.lastSelection.text === selectText
                    ) {
                        return;
                    }

                    // top-left of selection start and end
                    const selectStartPos: Rect | null = update.view.coordsAtPos(selectFrom);
                    const selectEndPos: Rect | null = update.view.coordsAtPos(selectTo);
                    if (!selectStartPos || !selectEndPos) return;

                    const toolbar = plugin.settingsManager.getToolbarById(plugin.settings.textToolbar);
                    // TODO: show an error if toolbar not found
                    if (!toolbar) return;

                    // remove the existing toolbar because we're likely in a new position
                    if (this.toolbarEl) {
                        this.toolbarEl.remove();
                    }

                    const activeFile = plugin.app.workspace.getActiveFile();
                    const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
                    if (!activeFile || !activeView) return;

                    this.toolbarEl = activeDocument.createElement('div');
                    this.toolbarEl.id = toolbar.uuid;
                    this.toolbarEl.addClasses([
                        'cg-note-toolbar-container', 'cm-embed-block', 'cm-callout', 'cg-note-toolbar-bar-container'
                    ]);
                    this.toolbarEl.setAttrs({
                        'data-name': toolbar.name,
                        'data-tbar-position': PositionType.Text,
                        'data-updated': toolbar.updated,
                        // 'data-view-mode': markdownViewMode,
                        'data-csstheme': plugin.app.vault.getConfig('cssTheme')
                    });

                    const renderedToolbarEl = await plugin.renderToolbarAsCallout(toolbar, activeFile, activeView);
                    this.toolbarEl.appendChild(renderedToolbarEl);
                    activeDocument.body.appendChild(this.toolbarEl);
                    
                    const centerX = (selectStartPos.left + selectEndPos.right) / 2;
                    this.toolbarEl.style.left = `${centerX - (this.toolbarEl.offsetWidth / 2)}px`;
                    this.toolbarEl.style.top = `${selectStartPos.top - this.toolbarEl.offsetHeight - 8}px`;

                    plugin.registerDomEvent(this.toolbarEl, 'contextmenu', (e) => plugin.toolbarContextMenuHandler(e));

                    // TODO: need this for placing within modals?
                    // const modalEl = activeDocument.querySelector('.modal-container .note-toolbar-ui') as HTMLElement;
                    // position relative to modal container if in a modal
                    // if (modalEl) modalEl.insertAdjacentElement('afterbegin', embedBlock)
                    // else ...

                    // TODO: is this the right spot?
                    if (!this.isMouseSelection) {
                        this.isMouseDown = false;
                    }

                });

            }

            destroy() {
                if (this.toolbarEl) this.toolbarEl.remove();
                plugin.debug('TextToolbarView destroyed');
            }
        }

    );

}
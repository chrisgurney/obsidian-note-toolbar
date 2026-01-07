import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import NoteToolbarPlugin from 'main';
import { MarkdownView, Notice } from 'obsidian';
import { PositionType, t } from 'Settings/NoteToolbarSettings';

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

    private lastSelection: { from: number; to: number; text: string } | null = null;
    private selection: { from: number; to: number; text: string } | null = null;

    constructor(
        view: EditorView, 
        private ntb: NoteToolbarPlugin
    ) {}

    update(update: ViewUpdate) {

        // if there's no text toolbar set, there's nothing to do
        if (!this.ntb.settings.textToolbar) {
            // plugin.debug('no text toolbar setting');
            if (this.ntb.render.hasFloatingToolbar()) this.ntb.render.removeFloatingToolbar();
            return;
        };

        // if disabled, do not display for keyboard selections
        if (!this.ntb.settings.textToolbarOnKeyboard && this.ntb.listeners.document.isKeyboardSelection) {
            return;
        }

        // don't show toolbar until mouse selection is complete
        if (this.ntb.listeners.document.isMouseDown) {
            // fix: in source mode the mouse up event doesn't seem to fire after selection
            const currentView = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
            const isSourceMode = currentView?.getState().source;
            if (!isSourceMode) return;
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
        if (this.ntb.listeners.document.isContextOpening && this.selection.from === this.selection.from + 1) {
            // this.ntb.debug('TextToolbar: selection is just new line - exiting');
            this.ntb.listeners.document.isContextOpening = false;
            return;
        }

        if (!update.selectionSet) {
            if (this.ntb.render.isFloatingToolbarFocussed()) {
                // this.ntb.debug('TextToolbar: toolbar in focus - exiting');
                return;
            }
            // no text selected, or the view no longer has focus
            if (this.selection.from === this.selection.to || !view.hasFocus) {
                if (this.ntb.render.hasFloatingTextToolbar()) {
                    this.ntb.debugGroup('TextToolbar: ⛔️ no selection or view out of focus - removing toolbar');
                    this.ntb.debug(
                        ' • selection empty:', this.selection.from === this.selection.to, 
                        ' • view focussed:', view.hasFocus);
                    this.ntb.debugGroupEnd();
                    this.ntb.render.removeFloatingToolbar();
                }
                return;
            }
        }

        if (selection.empty) {
            this.lastSelection = null;
            if (this.ntb.render.hasFloatingTextToolbar()) {
                this.ntb.debug('TextToolbar: ⛔️ selection empty - removing toolbar');
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

            const toolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.textToolbar);
            if (!toolbar) {
                this.ntb.debug('⚠️ TextToolbar: Error: toolbar with ID', this.ntb.settings.textToolbar);
                new Notice(t('setting.error-invalid-text-toolbar')).containerEl.addClass('mod-warning');
                return;
            };

            // place the toolbar above the cursor, which takes the selection into account
            this.ntb.debug('🎨 TextToolbar: Rendering toolbar', toolbar.name);
            const cursorPos = this.ntb.utils.getPosition('cursor');
            await this.ntb.render.renderFloatingToolbar(toolbar, cursorPos, PositionType.Text);

            this.lastSelection = {
                from: this.selection.from,
                to: this.selection.to,
                text: this.selection.text
            };

        });

    }

    destroy() {
        if (this.ntb.render.hasFloatingToolbar()) this.ntb.render.removeFloatingToolbar();
    }

}
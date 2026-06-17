import type { EditorView, PluginValue, ViewUpdate } from '@codemirror/view';
import { ViewPlugin } from '@codemirror/view';
import { ItemType } from 'Settings/NoteToolbarSettings';
import NoteToolbarPlugin from 'main';
import { TbarData } from './ToolbarRenderer';

export default function CalloutPlugin(ntb: NoteToolbarPlugin): ViewPlugin<CalloutPluginClass> {

    // wrapper so we can pass in the ntb reference
    class CalloutPluginClassWithNtb extends CalloutPluginClass {
        constructor(view: EditorView) {
            super(view, ntb);
        }
    }
    
    return ViewPlugin.fromClass(CalloutPluginClassWithNtb);

}

/**
 * Adds attributes to callout blocks used for toolbars, so they can be styled appropriately.
 */
export class CalloutPluginClass implements PluginValue {

    constructor( view: EditorView, private ntb: NoteToolbarPlugin ) {
        this.process(view);
    }

    update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
            this.process(update.view);
        }
    }

    /**
     * Adds toolbar attributes to a callout's embed blocks and list items, for styling.
     * @param view EditorView to process
     */
    process(view: EditorView): void {
        // timeout lets CodeMirror finish updating the DOM before querying it
        window.setTimeout(() => {
            // this.ntb.debug('Processing callouts...');
            view.dom.querySelectorAll('.cm-embed-block').forEach((el) => {
                const toolbarEl = el.querySelector('.callout[data-callout="note-toolbar"]');
                el.toggleAttribute(TbarData.EmbedIsNoteToolbar, !!toolbarEl);

                const metaAttr = toolbarEl?.getAttr('data-callout-metadata');
                if (!toolbarEl) el.removeAttribute(TbarData.EmbedMeta);
                if (metaAttr) el.setAttribute(TbarData.EmbedMeta, metaAttr);

                const toolbarListEl = toolbarEl?.querySelector('.callout-content > ul') as HTMLElement;
                if (toolbarListEl) {
                    Array.from(toolbarListEl.children).forEach(el => {
                        el.removeAttribute(TbarData.LiItemType);
                        if (el.querySelector(':scope > hr, :scope > data[data-sep], :scope > a.external-link + data[data-sep]')) {
                            el.setAttribute(TbarData.LiItemType, ItemType.Separator);
                        } else if (el.querySelector(':scope > data[data-spread], :scope > a.external-link + data[data-spread]')) {
                            el.setAttribute(TbarData.LiItemType, ItemType.Spreader);
                        } else if (el.querySelector(':scope > br, :scope > data[data-break], :scope > a.external-link + data[data-break]')) {
                            el.setAttribute(TbarData.LiItemType, ItemType.Break);
                        }
                    });
                }
            });
        }, 0);
    }
}
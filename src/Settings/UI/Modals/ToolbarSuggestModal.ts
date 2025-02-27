import NoteToolbarPlugin from "main";
import { SuggestModal, TFile } from "obsidian";
import { t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { createToolbarPreviewFr } from "../Utils/SettingsUIUtils";

export class ToolbarSuggestModal extends SuggestModal<ToolbarSettings> {

    public plugin: NoteToolbarPlugin;
    public activeFile: TFile | null;
    private callback: (toolbar: ToolbarSettings) => void;
    private showPreviews: boolean = false;

    /**
     * Creates a new modal.
     * @param plugin NoteToolbarPlugin
     * @param activeFile TFile for the active file (so vars can be replaced)
     */
	constructor(plugin: NoteToolbarPlugin, activeFile: TFile | null, showPreviews: boolean = false, callback: (toolbar: ToolbarSettings) => void) {

        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");
        this.plugin = plugin;
        this.activeFile = activeFile;
        this.showPreviews = showPreviews;
        this.callback = callback;

        this.setPlaceholder(t('setting.toolbar-suggest-modal.placeholder'));
        this.setInstructions([
            {command: '↑↓', purpose: t('setting.toolbar-suggest-modal.instruction-navigate')},
            {command: '↵', purpose: t('setting.toolbar-suggest-modal.instruction-use')},
            {command: 'esc', purpose: t('setting.toolbar-suggest-modal.instruction-dismiss')},
        ]);

    }

    /**
     * Gets suggestions to display.
     * @param inputStr string to search
     * @returns array of ToolbarSettings
     */
    getSuggestions(inputStr: string): ToolbarSettings[] {
        const pluginToolbars = this.plugin.settings.toolbars;
        const tbarSuggestions: ToolbarSettings[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        pluginToolbars.forEach((toolbar: ToolbarSettings) => {
            if (toolbar.name.toLowerCase().includes(lowerCaseInputStr)) {
                tbarSuggestions.push(toolbar);
            }
        });

        return tbarSuggestions;
    }

    /**
     * Renders a suggestion in the modal's list.
     * @param item ToolbarItemSettings to render
     * @param el HTMLElement to render it in
     */
    renderSuggestion(toolbar: ToolbarSettings, el: HTMLElement): void {
        let toolbarNameEl = el.createSpan();
        toolbarNameEl.setText(toolbar.name);
        if (this.showPreviews) {
            let previewContainerEl = el.createDiv();
            previewContainerEl.addClass('setting-item-description');
            let previewEl = previewContainerEl.createDiv();
            previewEl.addClass('note-toolbar-setting-toolbar-list-preview-item');
            let previewFr = createToolbarPreviewFr(this.plugin, toolbar, undefined);
            previewEl.append(previewFr);
            el.append(previewContainerEl);
        }
    }

    /**
     * Closes the modal and executes the given item.
     * @param toolbar ToolbarSettings to use.
     */
    async onChooseSuggestion(toolbar: ToolbarSettings, event: MouseEvent | KeyboardEvent) {
        this.callback(toolbar);
        this.close();
    }

}
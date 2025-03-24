import NoteToolbarPlugin from "main";
import { SuggestModal, TFile } from "obsidian";
import { EMPTY_TOOLBAR, EMPTY_TOOLBAR_ID, t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { createOnboardingMessageEl, createToolbarPreviewFr } from "../Utils/SettingsUIUtils";
import { debugLog } from "Utils/Utils";

export class ToolbarSuggestModal extends SuggestModal<ToolbarSettings> {

    public plugin: NoteToolbarPlugin;

    /**
     * Creates a new modal.
     * @param plugin NoteToolbarPlugin
     * @param showPreviews true if toolbar previews should be shown
     * @param showSwapUi true if UI for swap toolbars should be shown (e.g., default toolbar option)
     * @param callback function to call when a toolbar is selected
     */
	constructor(
        plugin: NoteToolbarPlugin,
        private showPreviews: boolean, 
        private showSwapUi: boolean,
        private callback: (toolbar: ToolbarSettings) => void) {

        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");
        this.plugin = plugin;

        this.setPlaceholder(t('setting.toolbar-suggest-modal.placeholder'));
        this.setInstructions([
            {command: '↑↓', purpose: t('setting.toolbar-suggest-modal.instruction-navigate')},
            {command: '↵', purpose: t('setting.toolbar-suggest-modal.instruction-use')},
            {command: 'esc', purpose: t('setting.toolbar-suggest-modal.instruction-dismiss')},
        ]);

        if (this.showSwapUi) {
            // show warning message about properties being changed
            const onboardingId = 'swap-toolbars-prop';
            if (!this.plugin.settings.onboarding[onboardingId]) {
                let resultsEl = this.modalEl.querySelector('.prompt-results');
                if (resultsEl) {
                    let messageEl = createOnboardingMessageEl(this.plugin, 
                        onboardingId, 
                        t('onboarding.swap-toolbar-title'), 
                        t('onboarding.swap-toolbar-content', { property: this.plugin.settings.toolbarProp }));
                    resultsEl.insertAdjacentElement('beforebegin', messageEl);
                }    
            }
        }

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

        if (this.showSwapUi) {
            let emptyToolbar = EMPTY_TOOLBAR;
            emptyToolbar.name = t('setting.item-suggest-modal.option-default');
            tbarSuggestions.push(emptyToolbar);
        }

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
        if (this.showPreviews && toolbar.uuid !== EMPTY_TOOLBAR_ID) {
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
import NoteToolbarPlugin from "main";
import { SuggestModal, TFile } from "obsidian";
import { EMPTY_TOOLBAR, EMPTY_TOOLBAR_ID, LocalVar, t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { createOnboardingMessageEl, createToolbarPreviewFr } from "../Utils/SettingsUIUtils";

export default class ToolbarSuggestModal extends SuggestModal<ToolbarSettings> {

    /**
     * Creates a new modal.
     * @param ntb NoteToolbarPlugin
     * @param showPreviews true if toolbar previews should be shown
     * @param showSwapUi true if UI for swap toolbars should be shown (e.g., default toolbar option)
     * @param showNewOption true if UI should show a "New toolbar" option (for adding items from the Gallery)
     * @param callback function to call when a toolbar is selected
     */
	constructor(
        private ntb: NoteToolbarPlugin,
        private showPreviews: boolean, 
        private showSwapUi: boolean,
        private showNewOption: boolean,
        private callback: (toolbar: ToolbarSettings) => void) {

        super(ntb.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");
        this.ntb = ntb;

        this.setPlaceholder(
            showNewOption 
                ? t('setting.toolbar-suggest-modal.placeholder-add') 
                : t('setting.toolbar-suggest-modal.placeholder'));
        this.setInstructions([
            {command: '↑↓', purpose: t('setting.toolbar-suggest-modal.instruction-navigate')},
            {command: '↵', purpose: t('setting.toolbar-suggest-modal.instruction-use')},
            {command: 'esc', purpose: t('setting.toolbar-suggest-modal.instruction-dismiss')},
        ]);

        if (this.showSwapUi) {
            // show warning message about properties being changed
            const onboardingId = 'swap-toolbars-prop';
            if (!this.ntb.settings.onboarding[onboardingId]) {
                let resultsEl = this.modalEl.querySelector('.prompt-results');
                if (resultsEl) {
                    let messageEl = createOnboardingMessageEl(this.ntb, 
                        onboardingId, 
                        t('onboarding.swap-toolbar-title'), 
                        t('onboarding.swap-toolbar-content', { property: this.ntb.settings.toolbarProp }));
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
        const pluginToolbars = this.ntb.settings.toolbars;
        const tbarSuggestions: ToolbarSettings[] = [];
        const sortedSuggestions: ToolbarSettings[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        if (this.showSwapUi) {
            let emptyToolbar = { ...EMPTY_TOOLBAR };
            emptyToolbar.name = t('setting.toolbar-suggest-modal.option-default');
            tbarSuggestions.push(emptyToolbar);
        }
        else if (this.showNewOption) {
            let newToolbar = { ...EMPTY_TOOLBAR };
            newToolbar.name = t('setting.toolbar-suggest-modal.option-new');
            tbarSuggestions.push(newToolbar);
        }

        pluginToolbars.forEach((toolbar: ToolbarSettings) => {
            if (toolbar.name !== '' && toolbar.name.toLowerCase().includes(lowerCaseInputStr)) {
                sortedSuggestions.push(toolbar);
            }
        });

        // sort the search results
        const recentToolbars = JSON.parse(this.ntb.app.loadLocalStorage(LocalVar.RecentToolbars) || '[]');
        sortedSuggestions.sort((a, b) => {
            const query = lowerCaseInputStr;
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            const aStartsWith = aName.startsWith(query);
            const bStartsWith = bName.startsWith(query);

            // prioritize recent items if they start with the search string
            if (aStartsWith && bStartsWith) {
                const isARecent = recentToolbars.includes(aName);
                const isBRecent = recentToolbars.includes(bName);
                if (isARecent && !isBRecent) return -1;
                if (!isARecent && isBRecent) return 1;
            }

            // prioritize items that start with the search string
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            const aIncludes = aName.includes(query);
            const bIncludes = bName.includes(query);
            if (aIncludes && !bIncludes) return -1;
            if (!aIncludes && bIncludes) return 1;

            return aName.localeCompare(bName);
        });

        return tbarSuggestions.concat(sortedSuggestions);
    }

    /**
     * Renders a suggestion in the modal's list.
     * @param item ToolbarItemSettings to render
     * @param el HTMLElement to render it in
     */
    renderSuggestion(toolbar: ToolbarSettings, el: HTMLElement): void {
        let toolbarNameEl = el.createSpan();
        toolbarNameEl.setText(toolbar.name);
        if (toolbar.uuid === EMPTY_TOOLBAR_ID) {
            el.addClass('cm-em');
        }
        if (this.showPreviews && toolbar.uuid !== EMPTY_TOOLBAR_ID) {
            let previewContainerEl = el.createDiv();
            previewContainerEl.addClass('setting-item-description');
            let previewEl = previewContainerEl.createDiv();
            previewEl.addClass('note-toolbar-setting-toolbar-list-preview-item');
            let previewFr = createToolbarPreviewFr(this.ntb, toolbar, undefined);
            previewEl.append(previewFr);
            el.append(previewContainerEl);
        }
    }

    /**
     * Closes the modal and executes the given item.
     * @param toolbar ToolbarSettings to use.
     */
    async onChooseSuggestion(toolbar: ToolbarSettings, event: MouseEvent | KeyboardEvent) {
        await this.ntb.settingsManager.updateRecentList(LocalVar.RecentToolbars, toolbar.name);
        this.callback(toolbar);
        this.close();
    }

}
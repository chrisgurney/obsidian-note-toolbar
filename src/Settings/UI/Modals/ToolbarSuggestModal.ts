import NoteToolbarPlugin from "main";
import { Platform, SuggestModal } from "obsidian";
import { EMPTY_TOOLBAR, EMPTY_TOOLBAR_ID, LocalVar, NONE_TOOLBAR, NONE_TOOLBAR_ID, t, ToolbarSettings } from "Settings/NoteToolbarSettings";
import ToolbarSettingsModal from "./ToolbarSettingsModal";

/**
 * `Default` = Just uses modal to select a toolbar.
 * `QuickTools` = Opens the toolbar versus just selecting it.
 */
export type ToolbarSuggestMode = 'Default' | 'QuickTools';

export default class ToolbarSuggestModal extends SuggestModal<ToolbarSettings> {

    /**
     * Creates a new modal.
     * @param ntb NoteToolbarPlugin
     * @param showPreviews true if toolbar previews should be shown
     * @param showSwapUi true if UI for swap toolbars should be shown (e.g., default toolbar option)
     * @param showNewOption true if UI should show a "New toolbar" option (for adding items from the Gallery)
     * @param callback function to call when a toolbar is selected
     * @param mode ToolbarSuggestMode to use
     */
	constructor(
        private ntb: NoteToolbarPlugin,
        private showPreviews: boolean, 
        private showSwapUi: boolean,
        private showNewOption: boolean,
        private callback: (toolbar: ToolbarSettings) => void,
        private mode: ToolbarSuggestMode = 'Default'
    ) {

        super(ntb.app);
        this.modalEl.addClass("note-toolbar-setting-item-suggester-dialog");

        this.setPlaceholder(
            showNewOption 
                ? t('setting.toolbar-suggest-modal.placeholder-add') 
                : t('setting.toolbar-suggest-modal.placeholder'));

        const instructions = [];
        instructions.push(
            {command: '↑↓', purpose: t('setting.toolbar-suggest-modal.instruction-navigate')},
            {command: '↵', purpose: t('setting.toolbar-suggest-modal.instruction-use')},
        );
        if (mode === 'QuickTools') {
            instructions.push(
                {command: (Platform.isWin || Platform.isLinux) ? t('setting.toolbar-suggest-modal.key-edit-windows') : t('setting.toolbar-suggest-modal.key-edit-macos'), purpose: t('setting.toolbar-suggest-modal.instruction-edit')},
            );
        }
        instructions.push(
            {command: 'esc', purpose: t('setting.toolbar-suggest-modal.instruction-dismiss')},
        );
        this.setInstructions(instructions);

        if (this.showSwapUi) {
            // show warning message about properties being changed
            const onboardingId = 'swap-toolbars-prop';
            if (!this.ntb.settings.onboarding[onboardingId]) {
                const resultsEl = this.modalEl.querySelector('.prompt-results');
                if (resultsEl) {
                    const messageEl = this.ntb.settingsUtils.createOnboardingMessageEl( 
                        onboardingId, 
                        t('onboarding.swap-toolbar-title'), 
                        t('onboarding.swap-toolbar-content', { property: this.ntb.settings.toolbarProp }));
                    resultsEl.insertAdjacentElement('beforebegin', messageEl);
                }    
            }
        }

        // handle meta key selections
        this.scope.register(null, 'Enter', (event) => this.handleKeyboardSelection(event));

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
            const emptyToolbar = { ...EMPTY_TOOLBAR };
            emptyToolbar.name = t('setting.toolbar-suggest-modal.option-default');
            const noneToolbar = { ...NONE_TOOLBAR };
            noneToolbar.name = t('setting.toolbar-suggest-modal.option-none');
            tbarSuggestions.push(emptyToolbar, noneToolbar);
        }
        else if (this.showNewOption) {
            const newToolbar = { ...EMPTY_TOOLBAR };
            newToolbar.name = t('setting.toolbar-suggest-modal.option-new');
            tbarSuggestions.push(newToolbar);
        }

        pluginToolbars.forEach((toolbar: ToolbarSettings) => {
            if (toolbar.name !== '' && toolbar.name.toLowerCase().includes(lowerCaseInputStr)) {
                sortedSuggestions.push(toolbar);
            }
        });

        // sort the search results
        const recentToolbars = JSON.parse(this.ntb.app.loadLocalStorage(LocalVar.RecentToolbars) as string || '[]') as string[];
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
        el.setAttribute('id', toolbar.uuid);
        const toolbarNameEl = el.createSpan();
        toolbarNameEl.setText(toolbar.name);
        const isSpecialToolbar = [EMPTY_TOOLBAR_ID, NONE_TOOLBAR_ID].includes(toolbar.uuid);
        if (isSpecialToolbar) {
            el.addClass('cm-em');
        }
        if (this.showPreviews && !isSpecialToolbar) {
            const previewContainerEl = el.createDiv();
            previewContainerEl.addClass('setting-item-description');
            const previewEl = previewContainerEl.createDiv();
            previewEl.addClass('note-toolbar-setting-toolbar-list-preview-item');
            const previewFr = this.ntb.settingsUtils.createToolbarPreviewFr(toolbar, undefined);
            previewEl.append(previewFr);
            el.append(previewContainerEl);
        }
    }

    /**
     * Closes the modal and executes the given item.
     * @param toolbar ToolbarSettings to use.
     */
    onChooseSuggestion(toolbar: ToolbarSettings, event: MouseEvent | KeyboardEvent) {
        // open the toolbar editor if the proper key modifiers are pressed
        const isModifierPressed = (Platform.isWin || Platform.isLinux) ? event?.ctrlKey : event?.metaKey;
        if (isModifierPressed && event?.shiftKey && !event?.altKey) {
            this.close();
            const modal = new ToolbarSettingsModal(this.ntb.app, this.ntb, null, toolbar);
            modal.setTitle(t('setting.title-edit-toolbar', { toolbar: toolbar.name, interpolation: { escapeValue: false } }));
            modal.open();
            return;
        }
        else {
            this.callback(toolbar);
            this.close();
        }
        void this.ntb.settingsManager.updateRecentList(LocalVar.RecentToolbars, toolbar.name);
    }

    /**
     * Handle case where keyboard with meta key is used to make selection. 
     * @param event KeyboardEvent
     */
    handleKeyboardSelection(event: KeyboardEvent) {
        const selectedItem = this.modalEl.querySelector('.suggestion-item.is-selected');
        const selected = selectedItem?.id ? this.ntb.settingsManager.getToolbarById(selectedItem?.id) : undefined;
        if (selected) this.onChooseSuggestion(selected, event);
    }

}
import { IconName, SuggestModal, getIconIds, setIcon } from "obsidian";
import NoteToolbarPlugin from "main";
import { debugLog } from "Utils/Utils";
import { NoteToolbarSettings, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";

export class IconSuggestModal extends SuggestModal<IconName> {

    private parentEl: HTMLElement;
    public plugin: NoteToolbarPlugin;
    private settingsWithIcon: ToolbarItemSettings | NoteToolbarSettings;

	constructor(plugin: NoteToolbarPlugin, settingsWithIcon: ToolbarItemSettings | NoteToolbarSettings, parentEl: HTMLElement) {
        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog");
        this.parentEl = parentEl;
        this.plugin = plugin;
        this.settingsWithIcon = settingsWithIcon;
        this.setPlaceholder(t('setting.icon-suggester.placeholder'));
        this.setInstructions([
            {command: '↑↓', purpose: t('setting.icon-suggester.instruction-navigate')},
            {command: '↵', purpose: t('setting.icon-suggester.instruction-use')},
            {command: 'esc', purpose: t('setting.icon-suggester.instruction-dismiss')},
        ]);
    }

    getSuggestions(inputStr: string): IconName[] {
        const iconIds = getIconIds();
        const iconSuggestions: IconName[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();
        iconSuggestions.push(t('setting.icon-suggester.option-no-icon'));
        iconIds.forEach((icon: IconName) => {
            if (icon.toLowerCase().contains(lowerCaseInputStr)) {
                iconSuggestions.push(icon);
            }
        });
        return iconSuggestions;
    }

    renderSuggestion(icon: IconName, el: HTMLElement): void {
        el.addClass("note-toolbar-icon-suggestion");
        let iconName = el.createSpan();
        if (icon === t('setting.icon-suggester.option-no-icon')) {
            iconName.setText(icon);
        }
        else {
            iconName.setText(icon.startsWith("lucide-") ? icon.substring(7) : icon);
            let iconGlyph = el.createSpan();
            setIcon(iconGlyph, icon);
        }
    }

    /**
     * Saves the selected icon to settings, closes the modal, refreshes the parent.
     * @param selectedIcon Icon to save.
     */
    onChooseSuggestion(selectedIcon: string, evt: MouseEvent | KeyboardEvent) {
        debugLog("onChooseSuggestion: ", this.settingsWithIcon);
        this.settingsWithIcon.icon = (selectedIcon === t('setting.icon-suggester.option-no-icon') ? "" : selectedIcon);
        // TODO: make below a callback instead (see CommandSuggestModal)
        this.plugin.settingsManager.save();
        debugLog("this.parentEl:", this.parentEl);
        if (this.parentEl.hasClass('note-toolbar-setting-items-container-row')) {
            // update the icon for the preview and form
            let formEl = this.parentEl.querySelector('.note-toolbar-setting-item-icon .clickable-icon') as HTMLElement;
            formEl ? setIcon(formEl, selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'lucide-plus-square' : selectedIcon) : undefined;
            formEl.setAttribute('data-note-toolbar-no-icon', selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'true' : 'false');
            let previewIconEl = this.parentEl.querySelector('.note-toolbar-setting-item-preview > span') as HTMLElement;
            previewIconEl ? setIcon(previewIconEl, selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'note-toolbar-none' : selectedIcon) : undefined;
        }
        else {
            // update Mobile Settings > Mobile icon
            setIcon(this.parentEl, selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'lucide-plus-square' : selectedIcon);
            this.parentEl.setAttribute('data-note-toolbar-no-icon', selectedIcon === t('setting.icon-suggester.option-no-icon') ? 'true' : 'false');
        }
        this.close();
    }

}
import { IconName, SuggestModal, getIconIds, setIcon } from "obsidian";
import NoteToolbarPlugin from "src/main";
import { debugLog } from "src/Utils/Utils";
import { NoteToolbarSettings, ToolbarItemSettings } from "../NoteToolbarSettings";

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
        this.setPlaceholder("Search for an icon");
        this.setInstructions([
            {command: '↑↓', purpose: 'to navigate'},
            {command: '↵', purpose: 'to use'},
            {command: 'esc', purpose: 'to dismiss'},
        ]);
    }

    getSuggestions(inputStr: string): IconName[] {
        const iconIds = getIconIds();
        const iconSuggestions: IconName[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();
        iconSuggestions.push("No icon");
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
        if (icon === "No icon") {
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
        this.settingsWithIcon.icon = (selectedIcon === "No icon" ? "" : selectedIcon);
        this.plugin.settingsManager.save();
        debugLog("this.parentEl:", this.parentEl);
        if (this.parentEl.hasClass('note-toolbar-setting-items-container-row')) {
            // update the icon for the preview and form
            let formEl = this.parentEl.querySelector('.note-toolbar-setting-item-icon .clickable-icon') as HTMLElement;
            formEl ? setIcon(formEl, selectedIcon === 'No icon' ? 'lucide-plus-square' : selectedIcon) : undefined;
            formEl.setAttribute('data-note-toolbar-no-icon', selectedIcon === 'No icon' ? 'true' : 'false');
            let previewIconEl = this.parentEl.querySelector('.note-toolbar-setting-item-preview > span') as HTMLElement;
            previewIconEl ? setIcon(previewIconEl, selectedIcon === 'No icon' ? 'note-toolbar-none' : selectedIcon) : undefined;
        }
        else {
            // update Mobile Settings > Mobile icon
            setIcon(this.parentEl, selectedIcon === 'No icon' ? 'lucide-plus-square' : selectedIcon);
            this.parentEl.setAttribute('data-note-toolbar-no-icon', selectedIcon === 'No icon' ? 'true' : 'false');
        }
        this.close();
    }

}
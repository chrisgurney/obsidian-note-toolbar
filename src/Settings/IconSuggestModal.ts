import { IconName, SuggestModal, getIconIds, setIcon } from "obsidian";
import ToolbarSettingsModal from "./ToolbarSettingsModal";
import NoteToolbarPlugin from "src/main";
import { debugLog } from "src/Utils/Utils";
import { ToolbarSettings } from "./NoteToolbarSettings";

export class IconSuggestModal extends SuggestModal<IconName> {

    private parentEl: HTMLElement;
    public plugin: NoteToolbarPlugin;
    private toolbarItemIndex: number;
    private toolbarSettings: ToolbarSettings;

	constructor(parent: ToolbarSettingsModal, parentEl: HTMLElement, toolbarSettings: ToolbarSettings, index: number) {
        super(parent.plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog");
        this.parentEl = parentEl;
        this.plugin = parent.plugin;
        this.toolbarSettings = toolbarSettings;
        this.toolbarItemIndex = index;
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
    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        debugLog("onChooseSuggestion: ", this.toolbarItemIndex, item);
        this.toolbarSettings.items[this.toolbarItemIndex].icon = (item === "No icon" ? "" : item);
        this.plugin.saveSettings();
        setIcon(this.parentEl, item === "No icon" ? "lucide-plus-square" : item);
        this.parentEl.setAttribute("data-note-toolbar-no-icon", item === "No icon" ? "true" : "false");
        this.close();
    }

}
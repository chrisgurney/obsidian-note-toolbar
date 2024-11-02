import { IconName, SuggestModal, getIconIds, setIcon } from "obsidian";
import NoteToolbarPlugin from "main";
import { debugLog } from "Utils/Utils";
import { NoteToolbarSettings, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";

export class IconSuggestModal extends SuggestModal<IconName> {

    private parentEl: HTMLElement;
    public plugin: NoteToolbarPlugin;
    private settingsWithIcon: ToolbarItemSettings | NoteToolbarSettings;
    private callback: (icon: string) => void;

	constructor(plugin: NoteToolbarPlugin, callback: (icon: string) => void) {
        super(plugin.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog");
        this.plugin = plugin;
        this.callback = callback;
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
            if (icon.toLowerCase().includes(lowerCaseInputStr)) {
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
        this.callback(selectedIcon);
        this.close();
    }

}
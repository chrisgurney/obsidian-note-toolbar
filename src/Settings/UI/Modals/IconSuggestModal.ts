import { IconName, SuggestModal, getIconIds, setIcon } from "obsidian";
import NoteToolbarPlugin from "main";
import { NoteToolbarSettings, t, ToolbarItemSettings } from "Settings/NoteToolbarSettings";

export default class IconSuggestModal extends SuggestModal<IconName> {

	constructor(
        private ntb: NoteToolbarPlugin, 
        private selectedIcon: string | undefined,
        private showNoIconOption: boolean, 
        private callback: (icon: string) => void
    ) {
        super(ntb.app);
        this.modalEl.addClass("note-toolbar-setting-mini-dialog");
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
        this.showNoIconOption ? iconSuggestions.push(t('setting.icon-suggester.option-no-icon')) : null;
        iconIds.forEach((icon: IconName) => {
            if (icon.toLowerCase().includes(lowerCaseInputStr)) {
                iconSuggestions.push(icon);
            }
        });
        return iconSuggestions;
    }

    onOpen(): void {
        if (this.selectedIcon && this.selectedIcon !== '') {
            const iconName = this.selectedIcon.replace(/^lucide-/, '')
            this.inputEl.value = iconName;
            this.inputEl.trigger('input');
        }
        else {
            super.onOpen();
        }
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
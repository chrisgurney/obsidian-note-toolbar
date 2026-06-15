import { IconName, SuggestModal, getIconIds, setIcon } from "obsidian";
import NoteToolbarPlugin from "main";
import { t } from "Settings/NoteToolbarSettings";

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
        if (this.showNoIconOption) iconSuggestions.push(t('setting.icon-suggester.option-no-icon'));
        iconIds.forEach((icon: IconName) => {
            if (icon.toLowerCase().includes(lowerCaseInputStr)) {
                iconSuggestions.push(icon);
            }
        });
        return iconSuggestions;
    }

    async onOpen(): Promise<void> {
        if (this.selectedIcon && this.selectedIcon !== '') {
            const iconName = this.selectedIcon.replace(/^lucide-/, '')
            this.inputEl.value = iconName;
            this.inputEl.trigger('input');
        }
        else {
            await super.onOpen();
        }
    }

    renderSuggestion(icon: IconName, el: HTMLElement): void {
        el.addClass("note-toolbar-icon-suggestion");
        const iconName = el.createSpan();
        if (icon === t('setting.icon-suggester.option-no-icon')) {
            iconName.setText(icon);
        }
        else {
            iconName.setText(icon.startsWith("lucide-") ? icon.substring(7) : icon);
            const iconGlyph = el.createSpan();
            setIcon(iconGlyph, icon);
        }
    }

    /**
     * Saves the selected icon to settings, closes the modal, refreshes the parent.
     * @param selectedIcon Icon to save.
     */
    onChooseSuggestion(selectedIcon: string, _event: MouseEvent | KeyboardEvent) {
        this.callback(selectedIcon);
        this.close();
    }

}
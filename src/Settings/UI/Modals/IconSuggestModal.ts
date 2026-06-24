import NoteToolbarPlugin from "main";
import { FuzzyMatch, FuzzySuggestModal, IconName, getIconIds, setIcon } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";

export default class IconSuggestModal extends FuzzySuggestModal<IconName> {

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

    getItems(): string[] {
        const items: string[] = [];
        if (this.showNoIconOption) {
            items.push(t('setting.icon-suggester.option-no-icon'));
        }
        items.push(...getIconIds());
        return items;
    }

    getItemText(icon: string): string {
        if (icon === t('setting.icon-suggester.option-no-icon')) {
            return icon;
        }
        return icon.startsWith('lucide-')
            ? icon.substring(7)
            : icon;
    }

    async onOpen(): Promise<void> {
        await super.onOpen();
        if (this.selectedIcon && this.selectedIcon !== '') {
            const iconName = this.selectedIcon.replace(/^lucide-/, '');
            this.inputEl.value = iconName;
            this.inputEl.trigger('input');
        }
    }

    renderSuggestion(icon: FuzzyMatch<IconName>, el: HTMLElement): void {
        el.addClass("note-toolbar-icon-suggestion");
        const iconName = el.createSpan();
        if (icon.item === t('setting.icon-suggester.option-no-icon')) {
            iconName.setText(icon.item);
            el.addClass('cm-em');
        }
        else {
            iconName.setText(icon.item.startsWith("lucide-") ? icon.item.substring(7) : icon.item);
            const iconGlyph = el.createSpan();
            setIcon(iconGlyph, icon.item);
        }
    }

    /**
     * Saves the selected icon to settings, closes the modal, refreshes the parent.
     * @param selectedIcon Icon to save.
     */
    onChooseItem(selectedIcon: string, _event: MouseEvent | KeyboardEvent) {
        this.callback(selectedIcon);
        this.close();
    }

}
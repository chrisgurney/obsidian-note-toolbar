import { AbstractInputSuggest, App, IconName, getIconIds, setIcon } from "obsidian";

export class IconSuggester extends AbstractInputSuggest<IconName> {

    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        inputEl.addClass("note-toolbar-icon-input");
        this.inputEl = inputEl;
    }

    getSuggestions(inputStr: string): IconName[] {
        const iconIds = getIconIds();
        const iconSuggestions: IconName[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

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
        iconName.setText(icon.startsWith("lucide-") ? icon.substring(7) : icon);
        let iconGlyph = el.createSpan();
        setIcon(iconGlyph, icon);
    }

    selectSuggestion(icon: IconName): void {
        this.inputEl.value = icon;
        this.inputEl.trigger("input");
        this.close();
    }
}
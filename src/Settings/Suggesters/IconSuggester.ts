// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, IconName, TAbstractFile, TFolder, getIconIds, setIcon } from "obsidian";
import { TextInputSuggester } from "./suggester";
import NoteToolbarPlugin from "src/main";

export class IconSuggester extends TextInputSuggester<IconName> {

    private plugin: NoteToolbarPlugin;

    constructor(app: App, plugin: NoteToolbarPlugin, inputEl: HTMLInputElement | HTMLTextAreaElement) {
        super(app, inputEl);
        inputEl.addClass("note-toolbar-icon-input");
        this.plugin = plugin;
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
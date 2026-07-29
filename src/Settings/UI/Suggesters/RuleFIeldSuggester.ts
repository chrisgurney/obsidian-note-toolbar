import { AbstractInputSuggest, App } from "obsidian";
import { RuleOperand } from "Settings/NoteToolbarSettings";

/**
 * This is a rough equivalent of Obsidian's Bases "property" suggester.
 * Not calling it that to prevent confusion, but the concept is the same:
 * It shows a list of all things you can define toolbar rules for including:
 * note properties, file name, file type, platform, editor mode, tags, etc.
 */
export default class RuleFieldSuggester extends AbstractInputSuggest<RuleOperand> {

    constructor(
        app: App, 
        inputEl: HTMLInputElement,
    ) {
        super(app, inputEl);
    }

    getSuggestions(inputStr: string): RuleOperand[] {
        const suggestions: RuleOperand[] = [];

        // TODO: add built-in suggestions - filename, file type, view type, ...
        // TODO: add suggestions - note properties
        // TODO: sort suggestions

        return suggestions;
    }

    renderSuggestion(operand: RuleOperand, el: HTMLElement): void {
        el.setText(operand.label);
    }

    selectSuggestion(operand: RuleOperand): void {
        this.close();
    }
}
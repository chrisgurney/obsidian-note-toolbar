import NoteToolbarPlugin from "main";
import { AbstractInputSuggest, setIcon } from "obsidian";
import { RULE_OPERANDS, RuleOperand } from "Settings/NoteToolbarSettings";

/**
 * Rough equivalent of Obsidian's Bases "property" suggester.
 * Shows a list of all things you can define toolbar rules for including:
 * note properties, file name, file type, platform, editor mode, tags, etc.
 */
export default class RuleOperandSuggester extends AbstractInputSuggest<RuleOperand> {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private inputEl: HTMLInputElement,
        private callback: (operand: RuleOperand) => void,
        private classes?: string[]
    ) {
        super(ntb.app, inputEl);
    }

    getSuggestions(inputStr: string): RuleOperand[] {
        const normalizedInput = inputStr.toLowerCase();

        // const propertyOperand = RULE_OPERANDS.find(operand => operand.id === 'property')!;
        const operands = RULE_OPERANDS.filter(operand => operand.id !== 'property');

        // const properties: RuleOperand[] = Object.keys(this.app.metadataTypeManager.properties)
        //     .sort((a, b) => a.localeCompare(b))
        //     .map(label => ({
        //         ...propertyOperand,
        //         id: label,
        //         label,
        //         key: label
        //     }));

        // return [
        //     ...operands.sort((a, b) => a.label.localeCompare(b.label)),
        //     ...properties
        // ].filter(operand =>
        //     operand.label.toLowerCase().includes(normalizedInput)
        // );

        return [...operands]
            .sort((a, b) => a.label.localeCompare(b.label))
            .filter((operand) =>
                operand.label.toLowerCase().includes(normalizedInput)
            );
    }

    renderSuggestion(operand: RuleOperand, el: HTMLElement): void {
        if (this.classes) el.addClasses(this.classes);
        const containerEl = el.createDiv({ cls: 'note-toolbar-rule-suggestion-container' });
        const iconEl = containerEl.createDiv();
        const labelEl = containerEl.createDiv();

        setIcon(iconEl, operand.icon ?? 'circle');
        labelEl.setText(operand.label);
    }

    selectSuggestion(operand: RuleOperand): void {
        this.setValue(operand.label);
        this.callback(operand);
        this.close();
    }

}
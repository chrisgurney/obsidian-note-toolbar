import { AbstractInputSuggest, App, Command } from "obsidian";

export class CommandSuggester extends AbstractInputSuggest<Command> {

    private inputEl: HTMLInputElement;
    private commands: Command[];

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
        this.commands = Object.values(this.app.commands.commands);
    }

    getSuggestions(inputStr: string): Command[] {
        const suggestions: Command[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();
        this.inputEl.removeAttribute("data-command-id");

        this.commands.forEach((command: Command) => {
            if (command.name.toLowerCase().includes(lowerCaseInputStr)) {
                suggestions.push(command);
            }
        });

        // if there's only one result and it matches the suggestion, just select it
        if ((suggestions.length === 1) && suggestions[0].name.toLowerCase() === lowerCaseInputStr) {
            this.inputEl.setAttribute("data-command-id", suggestions[0].id);
        }

        return suggestions;
    }

    renderSuggestion(command: Command, el: HTMLElement): void {
        el.setText(command.name);
    }

    selectSuggestion(command: Command): void {
        this.inputEl.value = command.name;
        this.inputEl.setAttribute("data-command-id", command.id);
        this.inputEl.trigger("input");
        this.inputEl.blur();
        this.close();
    }
}
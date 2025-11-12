import { AbstractInputSuggest, App, Command } from "obsidian";

export default class CommandSuggester extends AbstractInputSuggest<Command> {

    private commands: Command[];
    private callback: (command: Command) => void

    constructor(app: App, inputEl: HTMLInputElement, callback: (command: Command) => void) {
        super(app, inputEl);
        this.callback = callback;
        this.commands = Object.values(this.app.commands.commands);
    }

    getSuggestions(inputStr: string): Command[] {
        const suggestions: Command[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        this.commands.forEach((command: Command) => {
            if (command.name.toLowerCase().includes(lowerCaseInputStr)) {
                suggestions.push(command);
            }
        });

        return suggestions;
    }

    renderSuggestion(command: Command, el: HTMLElement): void {
        el.setText(command.name);
    }

    selectSuggestion(command: Command): void {
        this.callback(command);
        this.close();
    }
}
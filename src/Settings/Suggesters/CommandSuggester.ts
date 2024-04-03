import { AbstractInputSuggest, App, Command } from "obsidian";

declare module "obsidian" {
    interface App {
        commands: {
            executeCommandById: (id: string) => unknown;
            listCommands: () => [{ id: string; name: string }];
            commands: Record<string, { name: string; id: string }>;
        };
    }
}

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

        this.commands.forEach((command: Command) => {
            if (command.name.toLowerCase().contains(lowerCaseInputStr)) {
                suggestions.push(command);
            }
        });

        return suggestions;
    }

    renderSuggestion(command: Command, el: HTMLElement): void {
        el.setText(command.name);
    }

    selectSuggestion(command: Command): void {
        this.inputEl.value = command.name;
        this.inputEl.setAttribute("data-command-id", command.id);
        this.inputEl.trigger("input");
        this.close();
    }
}
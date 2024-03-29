// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, Command, TAbstractFile, TFolder } from "obsidian";
import { TextInputSuggester } from "./suggester";
import NoteToolbarPlugin from "src/main";

declare module "obsidian" {
    interface App {
        commands: {
            executeCommandById: (id: string) => unknown;
            listCommands: () => [{ id: string; name: string }];
            commands: Record<string, { name: string; id: string }>;
        };
    }
}

export class CommandSuggester extends TextInputSuggester<Command> {

    private plugin: NoteToolbarPlugin;
    private commands: Command[];

    constructor(app: App, plugin: NoteToolbarPlugin, inputEl: HTMLInputElement | HTMLTextAreaElement) {
        super(app, inputEl);
        this.plugin = plugin;
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
        // el.setAttribute("data-command-id", command.id);
    }

    selectSuggestion(command: Command): void {
        this.inputEl.value = command.name;
        // this.inputEl.setAttribute("data-command-id", command.id);
        this.inputEl.trigger("input");
        this.close();
    }
}
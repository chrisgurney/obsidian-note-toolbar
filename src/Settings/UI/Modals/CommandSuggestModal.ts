import NoteToolbarPlugin from "main";
import { Command, SuggestModal } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";

export default class CommandSuggestModal extends SuggestModal<Command> {

    private commands: Command[];

	constructor(
        private ntb: NoteToolbarPlugin, 
        private callback: (command: Command) => void
    ) {
        super(ntb.app);
        this.commands = Object.values(ntb.app.commands.commands);
        
        this.setPlaceholder(t('setting.command-suggest-modal.placeholder'));
        this.setInstructions([
            {command: '↑↓', purpose: t('setting.command-suggest-modal.instruction-navigate')},
            {command: '↵', purpose: t('setting.command-suggest-modal.instruction-use')},
            {command: 'esc', purpose: t('setting.command-suggest-modal.instruction-dismiss')},
        ]);
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

        return suggestions;
    }

    renderSuggestion(command: Command, el: HTMLElement): void {
        el.setText(command.name);
    }

    async onChooseSuggestion(command: Command, event: MouseEvent | KeyboardEvent) {
        this.callback(command);
        this.close();
    }

}
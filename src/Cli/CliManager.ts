import NoteToolbarPlugin from "main";
import CliDefinition from "./CliDefinition";
import CliHandlers from "./CliHandlers";

export default class CliManager {

    private cliDefinition: CliDefinition;
    private cliHandlers: CliHandlers;

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
        this.cliDefinition = new CliDefinition(this.ntb);
        this.cliHandlers = new CliHandlers(this.ntb, this.cliDefinition);
    }
    
    /**
     * Registers CLI commands. Called from plugin's `onLayoutReady()`.
     */
    register(): void {

        this.cliDefinition.load();

        // register the commands with Obsidian
        for (const cmd of this.cliDefinition.commands) {
            this.ntb.registerCliHandler(cmd.id, cmd.description, cmd.flags, this.cliHandlers.get(cmd.id));
        }

    }

}
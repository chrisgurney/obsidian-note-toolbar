import NoteToolbarPlugin from "main";
import { Platform, requireApiVersion } from "obsidian";
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
        
        // register the commands with Obsidian
        // duplicated Obsidian version check to ignore loop and pass Obsidian Community Scorecard flag
        if (Platform.isDesktop && requireApiVersion('1.12.2')) {
            this.cliDefinition.load();
            for (const cmd of this.cliDefinition.commands) {
                if (requireApiVersion('1.12.2')) this.ntb.registerCliHandler(
                    cmd.id, cmd.description, cmd.flags, this.cliHandlers.get(cmd.id));
            }
        }

    }

}
import NoteToolbarPlugin from "main";
import { t, VIEW_TYPE_HELP } from "Settings/NoteToolbarSettings";


export default class CliManager {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Register the plugin's CLI commands. Called from plugin's `onLayoutReady()`.
     */
    register(): void {

        this.ntb.registerCliHandler(
            'note-toolbar:help',
            t('command.name-open-help'),
            null,
            async (): Promise<string> => {
                this.ntb.app.workspace.getLeaf(true).setViewState({ type: VIEW_TYPE_HELP, active: true });
                return '';
            }
        );

    }

}
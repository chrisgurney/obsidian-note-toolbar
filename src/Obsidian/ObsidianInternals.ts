import NoteToolbarPlugin from "main";

export default class ObsidianInternals {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Gets lists of installed plugins, both community and internal.
     * @returns community and internal plugins installed
     */
    getPlugins(): { appPlugins: { [key: string]: any }, internalPlugins: { [key: string]: any } } {
        // @ts-ignore
        const appPlugins = this.ntb.app.plugins.plugins;
        // @ts-ignore
        const internalPlugins = this.ntb.app.internalPlugins.plugins;
        return { appPlugins, internalPlugins };
    }
    
}
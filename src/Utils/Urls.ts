/**
 * External URLs used by the plugin in Help pages, for sharing toolbars, and for loading release notes, tips, etc.
 */
export const URLS = {

    /**
     * Link to my donation page.
     */
    DONATE: 'https://buymeacoffee.com/cheznine',

    /**
     * Links to the GitHub repository's discussions, issues, releases, and user guide.
     */
    GH_DISCUSSIONS: 'https://github.com/chrisgurney/obsidian-note-toolbar/discussions',
    GH_ISSUES: 'https://github.com/chrisgurney/obsidian-note-toolbar/issues',
    GH_RELEASES: 'https://github.com/chrisgurney/obsidian-note-toolbar/releases',
    GH_USER_GUIDE: 'https://github.com/chrisgurney/obsidian-note-toolbar/wiki',

    /**
     * This is the web address used when sharing a toolbar.
     * When a toolbar is shared, the plugin opens this page and passes the toolbar data to it,
     * so it can be imported by another user.
     *
     * This page is hosted on GitHub Pages and is part of the plugin’s official infrastructure.
     *
     * For transparency, the source code for this page is available here:
     * https://github.com/chrisgurney/obsidian-note-toolbar/blob/gh-pages/docs/open.htm
     * https://github.com/chrisgurney/obsidian-note-toolbar/blob/gh-pages/docs/js/open.js
     */
    GHIO_SHARE: 'https://chrisgurney.github.io/obsidian-note-toolbar/open.htm?uri=',

    /**
     * Release notes are fetched as markdown from this URL, in the required language.
     * 
     * Example: https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/releases/en/1.30.md
     */
    GHUC_RELEASE_NOTES: 'https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/releases',

    /**
     * Tips are fetched as markdown from this URL, in the required language.
     * 
     * Example: https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/tips/en/getting-started.md
     */
    GHUC_TIPS: 'https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/docs/tips',

} as const;
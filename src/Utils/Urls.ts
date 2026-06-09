/**
 * External URLs referenced by the plugin are used for:
 * - links to user guide and donation pages; 
 * - a script for sharing toolbars with other users; and 
 * - for loading release notes and help tips.
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

} as const;
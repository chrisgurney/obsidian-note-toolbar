import { addIcon } from "obsidian";


/**
 * Note Toolbar's custom icons.
 * 
 * How I built these icons:
 * https://github.com/chrisgurney/obsidian-note-toolbar/blob/master/BUILD.md 
 */
export default class SettingsIcons {
    
    /** 
     * Adds icons to Obsidian's library. Call once on plugin initialization.
     */
    static register(): void {

        addIcon(
            'note-toolbar-empty', 
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="svg-icon note-toolbar-empty"></svg>'
        );
        addIcon(
            'note-toolbar-none', 
            '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="24" viewBox="0 0 0 24" fill="none" class="svg-icon note-toolbar-none"></svg>'
        );

        // toolbar separator item icon
        addIcon(
            'note-toolbar-separator', 
            '<path d="M23.4444 35.417H13.7222C8.35279 35.417 4 41.6988 4 44V55.5C4 57.8012 8.35279 64.5837 13.7222 64.5837H23.4444C28.8139 64.5837 33.1667 57.8012 33.1667 55.5L33.1667 44C33.1667 41.6988 28.8139 35.417 23.4444 35.417Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M86.4444 35.417H76.7222C71.3528 35.417 67 41.6988 67 44V55.5C67 57.8012 71.3528 64.5837 76.7222 64.5837H86.4444C91.8139 64.5837 96.1667 57.8012 96.1667 55.5L96.1667 44C96.1667 41.6988 91.8139 35.417 86.4444 35.417Z" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M49.8333 8.33301V91.6663" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        );	

        // toolbar item visibility icons
        addIcon(
            'note-toolbar-eye-dashed',
            '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="8.33333"><path d="m8.59168 51.45c-.34726-.9354-.34726-1.9645 0-2.9 3.38212-8.2006 9.12302-15.2123 16.49492-20.1462s16.0428-7.5679 24.9134-7.5679c8.8707 0 17.5416 2.634 24.9135 7.5679s13.1128 11.9456 16.4948 20.1462c.3473.9355.3473 1.9646 0 2.9-3.382 8.2006-9.1229 15.2124-16.4948 20.1463s-16.0428 7.5678-24.9135 7.5678c-8.8706 0-17.5415-2.6339-24.9134-7.5678s-13.1128-11.9457-16.49492-20.1463z" stroke-dasharray="16.67 16.67"/><path d="m50 62.5c6.9036 0 12.5-5.5964 12.5-12.5s-5.5964-12.5-12.5-12.5-12.5 5.5964-12.5 12.5 5.5964 12.5 12.5 12.5z"/></g>'
        );
        addIcon(
            'note-toolbar-monitor-circle', 
            '<g stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"><path d="m83.3334 12.5h-66.6667c-4.6024 0-8.33336 3.731-8.33336 8.3333v41.6667c0 4.6024 3.73096 8.3333 8.33336 8.3333h66.6667c4.6023 0 8.3333-3.7309 8.3333-8.3333v-41.6667c0-4.6023-3.731-8.3333-8.3333-8.3333z"/><path d="m33.3333 87.5h33.3334"/><path d="m50 70.833v16.6667"/><path d="m49.5 53.6602c6.9036 0 12.5-5.5965 12.5-12.5 0-6.9036-5.5964-12.5-12.5-12.5s-12.5 5.5964-12.5 12.5c0 6.9035 5.5964 12.5 12.5 12.5z"/></g>'
        );
        addIcon(
            'note-toolbar-monitor-text', 
            '<g stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"><path d="m31 34.1504h38"/><path d="m57 49.1504h-26"/><path d="m83.3333 12.5h-66.6666c-4.6024 0-8.33337 3.731-8.33337 8.3333v41.6667c0 4.6024 3.73097 8.3333 8.33337 8.3333h66.6666c4.6024 0 8.3334-3.7309 8.3334-8.3333v-41.6667c0-4.6023-3.731-8.3333-8.3334-8.3333z"/><path d="m50 70.833v16.6667"/><path d="m33.3333 87.5h33.3334"/></g>'
        );
        addIcon(
            'note-toolbar-pen-book', 
            '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"><path d="m69.9167 82.583h23.3333"/><path d="m93.7575 41.2011c1.5421-1.5416 2.4085-3.6328 2.4088-5.8133s-.8657-4.2719-2.4073-5.8139c-1.5417-1.5421-3.6328-2.4086-5.8134-2.4089-2.1805-.0002-4.2719.8657-5.8139 2.4074l-38.9259 38.9346c-.6772.6752-1.178 1.5065-1.4583 2.4208l-3.8529 12.6933c-.0754.2523-.0811.5202-.0165.7754.0646.2553.1971.4882.3834.6742s.4195.3181.6748.3823.5232.0581.7754-.0177l12.6962-3.85c.9134-.2778 1.7447-.7756 2.4209-1.4496z"/><path d="m39 26v22.4775"/><path d="m72.9749 20.1848c0-1.25 0-5.9348 0-7.1597-.6564-.6564-1.5467-1.0251-2.4749-1.0251h-17.5c-3.713 0-7.274 1.475-9.8995 4.1005s-4.1005 6.1865-4.1005 9.8995c0-3.713-1.475-7.274-4.1005-9.8995s-6.1865-4.1005-9.8995-4.1005h-17.5c-.92826 0-1.8185.3687-2.47487 1.0251-.65638.6564-1.02513 1.5466-1.02513 2.4749v45.5c0 .9283.36875 1.8185 1.02513 2.4749.65637.6564 1.54661 1.0251 2.47487 1.0251h21"/></g>'
        );
        addIcon(
            'note-toolbar-tablet-smartphone-circle', 
            '<g stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"><path d="m20.8333 33.333c-4.6023 0-8.3333 3.731-8.3333 8.3333v41.6667c0 4.6024 3.731 8.3333 8.3333 8.3333h25c4.6024 0 8.3334-3.7309 8.3334-8.3333v-18.6667"/><path d="m20.8333 16.6663c0-2.2101.878-4.3297 2.4408-5.8925 1.5628-1.56282 3.6824-2.44079 5.8926-2.44079h50c2.2101 0 4.3297.87797 5.8925 2.44079 1.5628 1.5628 2.4408 3.6824 2.4408 5.8925v66.6667c0 2.2102-.878 4.3298-2.4408 5.8926s-3.6824 2.4407-5.8925 2.4407h-10"/><path d="m33.3333 75h.0417"/><path d="m54.133 48.3301c6.9036 0 12.5-5.5965 12.5-12.5 0-6.9036-5.5964-12.5-12.5-12.5s-12.5 5.5964-12.5 12.5c0 6.9035 5.5964 12.5 12.5 12.5z"/></g>'
        );
        addIcon(
            'note-toolbar-tablet-smartphone-off', 
            '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"><path d="m31.8333 33.333h-11c-4.6023 0-8.3333 3.731-8.3333 8.3333v41.6667c0 4.6024 3.731 8.3333 8.3333 8.3333h25c4.6024 0 8.3334-3.7309 8.3334-8.3333v-28.6667"/><path d="m31.1667 8.33301h48c2.2101 0 4.3297.87797 5.8925 2.44079 1.5628 1.5628 2.4408 3.6824 2.4408 5.8925v46.6667"/><path d="m33.3333 75h.0417"/><path d="m8.33334 8.33301 83.33336 83.33329"/></g>'
        );
        addIcon(
            'note-toolbar-tablet-smartphone-text', 
            '<g stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"><path d="m20.8333 33.333c-4.6023 0-8.3333 3.731-8.3333 8.3333v41.6667c0 4.6024 3.731 8.3333 8.3333 8.3333h25c4.6024 0 8.3334-3.7309 8.3334-8.3333v-18.6667"/><path d="m20.8333 16.6663c0-2.2101.878-4.3297 2.4408-5.8925 1.5628-1.56282 3.6824-2.44079 5.8926-2.44079h50c2.2101 0 4.3297.87797 5.8925 2.44079 1.5628 1.5628 2.4408 3.6824 2.4408 5.8925v66.6667c0 2.2102-.878 4.3298-2.4408 5.8926s-3.6824 2.4407-5.8925 2.4407h-10"/><path d="m33.3333 75h.0417"/><path d="m38 30.3301h32"/><path d="m60 45.3301h-22"/></g>'
        );

    }

}
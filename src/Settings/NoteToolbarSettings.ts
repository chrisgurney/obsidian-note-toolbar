import { ToolbarItem } from '../main';

export interface NoteToolbarSettings {
	name: string;
	updated: string;
	toolbar: Array<ToolbarItem>;
}

export const DEFAULT_SETTINGS: NoteToolbarSettings = {
	name: "",
	updated: new Date().toISOString(),
	toolbar: [{ label: "", url: "", tooltip: "", hide_on_desktop: false, hide_on_mobile: false }]
};


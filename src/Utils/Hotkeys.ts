/**
 * Helper to display hotkeys in a human-readable format.
 * 
 * Credit: @mProjectsCode
 * {@link https://github.com/mProjectsCode/obsidian-lemons-search-plugin/blob/master/packages/obsidian/src/utils/Hotkeys.ts}
 */

import NoteToolbarPlugin from 'main';
import type { Command, Hotkey, KeymapInfo, Modifier } from 'obsidian';
import { Platform } from 'obsidian';

export type HotkeyKey =
	| 'hotkeySearchSelectionUp'
	| 'hotkeySearchSelectionDown'
	| 'hotkeySearchSelectionFirst'
	| 'hotkeySearchSelectionLast'
	| 'hotkeySearchFillSelection';

export const KEY_MAP: Record<string, string> = {
	ArrowLeft: '←',
	ArrowRight: '→',
	ArrowUp: '↑',
	ArrowDown: '↓',
	' ': 'Space',
};

export const MODIFIER_KEY_MAP: Record<Modifier, string> = Platform.isMacOS
	? {
			Mod: '⌘',
			Ctrl: '⌃',
			Meta: '⌘',
			Alt: '⌥',
			Shift: '⇧',
		}
	: {
			Mod: 'Ctrl',
			Ctrl: 'Ctrl',
			Meta: 'Win',
			Alt: 'Alt',
			Shift: 'Shift',
		};

export const MODIFIERS: Modifier[] = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'];

export const HOTKEY_SEPARATOR = ' ';

/**
 * A map of hotkeys to their handler functions.
 */
export type HotkeyFunctionMap = Map<HotkeyKey | Hotkey[], (modifiers: Modifier[]) => void>;

export default class HotkeyHelper {

	private ntb: NoteToolbarPlugin;

	constructor(ntb: NoteToolbarPlugin) {
		this.ntb = ntb;
	}

	parseModifiers(modifiers: string | string[] | null | undefined): Modifier[] {
		if (!modifiers) {
			return [];
		}

		const modifiersArray: string[] = Array.isArray(modifiers) ? modifiers : modifiers.split(',').map(m => m.trim() as Modifier);

		if (Platform.isMacOS) {
			if (modifiersArray.includes('Meta')) {
				modifiersArray.push('Mod');
			}
		} else {
			if (modifiersArray.includes('Ctrl')) {
				modifiersArray.push('Mod');
			}
		}

		return modifiersArray.filter(m => MODIFIERS.contains(m as Modifier)) as Modifier[];
	}

	getHotkeysForCommand(command: Command): (KeymapInfo | Hotkey)[] | undefined {
		const commandManagerKeys = this.ntb.app.hotkeyManager.getHotkeys(command.id) as (KeymapInfo | Hotkey)[] | undefined;
		return commandManagerKeys ?? command.hotkeys;
	}

    getHotkeyEl(command: Command): HTMLElement | undefined {
        let hotkeySpan;
        const hotkeyText = this.getHotkeyText(command);
        if (hotkeyText) {
            hotkeySpan = createSpan();
            hotkeySpan.addClass('note-toolbar-setting-hotkey');
            hotkeySpan.setText(hotkeyText);
        }
        return hotkeySpan;
    }

    getHotkeyText(command: Command): string | undefined {
        let hotkeyText = undefined;
        const hotkeys = this.ntb.hotkeys.stringifyHotkeysForCommand(command);
        if (hotkeys) {
            const formatFirstElement = (arr?: string[]): string => arr?.length ? `${arr[0]}` : '';
            hotkeyText = formatFirstElement(hotkeys);
        }
        return hotkeyText;
    }

	stringifyKey(key: string): string {
		return KEY_MAP[key] ?? key;
	}

	stringifyHotkey(hotkey: KeymapInfo | Hotkey): string {
		const key = this.stringifyKey(hotkey.key ?? 'None');
		if (!hotkey.modifiers || hotkey.modifiers.length === 0) {
			return key;
		}

		const modifiers = this.parseModifiers(hotkey.modifiers);
		return this.stringifyModifiers(modifiers) + HOTKEY_SEPARATOR + key;
	}

	stringifyHotkeys(hotkeys: (KeymapInfo | Hotkey | null | undefined)[] | null | undefined): string[] | undefined {
		if (!hotkeys) {
			return undefined;
		}

		const strings = [];

		for (const hotkey of hotkeys) {
			if (!hotkey) {
				continue;
			}
			strings.push(this.stringifyHotkey(hotkey));
		}

		return strings;
	}

    stringifyHotkeysForCommand(command: Command): string[] | undefined {
        const hotkeys = this.getHotkeysForCommand(command);
        return this.stringifyHotkeys(hotkeys);
    }

	stringifyModifiers(modifiers: Modifier[]): string {
		return modifiers.map(modifier => MODIFIER_KEY_MAP[modifier]).join(HOTKEY_SEPARATOR);
	}

}
import NoteToolbarPlugin from "main";
import { TFile, FileSystemAdapter } from "obsidian";
import { ErrorBehavior, ItemType, ToolbarSettings } from "Settings/NoteToolbarSettings";

/**
 * Provides utilities to resolve variables.
 */
export default class VariableResolver {

    constructor(
		private ntb: NoteToolbarPlugin
	) {}

    /**
     * Check if a string has vars {{ }} or expressions (Dataview or Templater)
     * @param s The string to check.
     */
    hasVars(s: string): boolean {
        let hasVars = /{{.*?}}/g.test(s);
        if (this.ntb.settings.scriptingEnabled) {
            if (!hasVars && this.ntb.adapters.hasPlugin(ItemType.Dataview)) {
                let prefix = this.ntb.adapters.dv?.getSetting('inlineQueryPrefix');
                hasVars = !!prefix && s.trim().startsWith(prefix);
                if (!hasVars) hasVars = s.trim().startsWith('{{dv:');
                // TODO? support dvjs? check for $= JS inline queries
                // if (!hasVars) {
                // 	prefix = this.dvAdapter?.getSetting('inlineJsQueryPrefix');
                // 	hasVars = !!prefix && s.trim().startsWith(prefix);
                // }
            }
            if (!hasVars && this.ntb.adapters.hasPlugin(ItemType.Templater)) {
                hasVars = s.trim().startsWith('<%');
            }
        }
        return hasVars;
    }

	replaceVar(s: string, varKey: string, replaceText: string): string {
		const regex = new RegExp(`{{\\s*(encode:)?\\s*${varKey}\\s*}}`);
		return s.replace(regex, (_, encode) => encode ? encodeURIComponent(replaceText) : replaceText);
	}

	/**
	 * Replace variables in the given string of the format {{prefix:variable_name}}, with metadata from the file.
	 * @param s String to replace the variables in.
	 * @param file File with the metadata (name, frontmatter) we'll use to fill in the variables.
	 * @param errorBehavior What to do with errors when they occur when replacing variables.
	 * @returns String with the variables replaced.
	 */
	async replaceVars(s: string, file: TFile | null, errorBehavior: ErrorBehavior = ErrorBehavior.Report): Promise<string> {

		// SELECTION
		const selection = this.ntb.api.getSelection();
		if (selection) s = this.replaceVar(s, 'selection', selection);

		// NOTE_TITLE
		const noteTitle = file?.basename;
		if (noteTitle) s = this.replaceVar(s, 'note_title', noteTitle);
	
		// FILE_PATH
		const filePath = file?.path;
		if (filePath) s = this.replaceVar(s, 'file_path', filePath);
		
		// VAULT_PATH
		if (this.ntb.app.vault.adapter instanceof FileSystemAdapter) {
			const vaultPath = this.ntb.app.vault.adapter.getBasePath();
			s = this.replaceVar(s, 'vault_path', vaultPath);
		}

		// PROP_ VARIABLES
		// have to get this at run/click-time, as file or metadata may not have changed
		let frontmatter = file ? this.ntb.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
		// replace any variable of format {{prop_KEY}} with the value of the frontmatter dictionary with key = KEY
		s = s.replace(/{{\s*(encode:)?\s*prop_(.*?)\s*}}/g, (match, encode, p1) => {
			const key = p1.trim();
			if (frontmatter && frontmatter[key] !== undefined) {
				// regex to remove [[ and ]] and any alias (bug #75), in case an internal link was passed
				// eslint-disable-next-line no-useless-escape
				const linkWrap = /\[\[([^\|\]]+)(?:\|[^\]]*)?\]\]/g;
				// handle the case where the prop might be a list, and convert numbers to strings
				let fm = Array.isArray(frontmatter[key]) ? frontmatter[key].join(',') : String(frontmatter[key]);
				fm = fm ? fm.replace(linkWrap, '$1') : '';
				// FIXME: should this be returning here? or just updating the string?
				return encode ? encodeURIComponent(fm) : fm;
			}
			else {
				return '';
			}
		});

		if (this.ntb.settings.scriptingEnabled) {

			// JAVASCRIPT
			if (s.trim().startsWith('{{js:')) {
				s = s.replace(/^{{js:\s*|\s*}}$/g, '');
				let result = await this.ntb.adapters.js?.use({ 
					pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ?  'evaluateIgnore' : 'evaluateInline',
					expression: s
				});
				s = (result && typeof result === 'string') ? result : '';
			}

			// PLUGIN EXPRESSIONS
			if (this.ntb.adapters.hasPlugin(ItemType.Dataview)) {
				let prefix = this.ntb.adapters.dv?.getSetting('inlineQueryPrefix');
				if ((prefix && s.trim().startsWith(prefix)) || s.trim().startsWith('{{dv:')) {
					// strip prefix before evaluation
					if (prefix && s.trim().startsWith(prefix)) s = s.slice(prefix.length);
					if (s.trim().startsWith('{{dv:')) s = s.trim().replace(/^{{dv:\s*|\s*}}$/g, '');
					s = s.trim();
					let result = await this.ntb.adapters.dv?.use({
						pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ?  'evaluateIgnore' : 'evaluateInline',
						expression: s
					});
					s = (result && typeof result === 'string') ? result : '';
				}
				// TODO? support for dvjs? example: $=dv.el('p', dv.current().file.mtime)
				// prefix = this.dvAdapter?.getSetting('inlineJsQueryPrefix');
				// if (prefix && s.trim().startsWith(prefix)) {
				// 	s = s.trim().slice(prefix.length); // strip prefix before evaluation
				// 	let result = await this.dvAdapter?.use({ pluginFunction: 'executeJs', expression: s });
				// 	s = result ? result : '';
				// }
			}

			if (this.ntb.adapters.hasPlugin(ItemType.JsEngine)) {
				if (s.trim().startsWith('{{jse:')) {
					s = s.replace(/^{{jse:\s*|\s*}}$/g, '');
					let result = await this.ntb.adapters.jsEngine?.use({ 
						pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ?  'evaluateIgnore' : 'evaluateInline',
						expression: s
					});
					s = (result && typeof result === 'string') ? result : '';
				}
			}

			if (this.ntb.adapters.hasPlugin(ItemType.Templater)) {
				if (s.trim().startsWith('<%') || s.trim().startsWith('{{tp:')) {
					// strip all prefixes
					if (s.trim().startsWith('{{tp:')) s = s.replace(/^{{tp:\s*|\s*}}$/g, '');
					s = s.trim();
					// add Templater's prefix back in for evaluation
					if (!s.startsWith('<%')) s = '<%' + s;
					if (!s.endsWith('%>')) s += '%>';
					let result = await this.ntb.adapters.tp?.use({ 
						pluginFunction: (errorBehavior === ErrorBehavior.Ignore) ? 'parseIgnore' : 'parseInline',
						expression: s
					});
					s = (result && typeof result === 'string') ? result : '';
				}
			}

		}

		return s;

	}

	/** 
	 * Replaces all vars in all labels for the given toolbar, so they can be replaced before render.
	 * @param toolbar toolbar to replace labels for
	 * @param file TFile to render the toolbar within (for context to resolve variables and expressions)
	 * @returns string array of labels with resolved values 
	 */
	async resolveLabels(toolbar: ToolbarSettings, file: TFile | null): Promise<string[]> {
		let resolvedLabels: string[] = [];
		for (const item of toolbar.items) {
			const resolvedLabel = await this.replaceVars(item.label, file);
			resolvedLabels.push(resolvedLabel);
		}
		return resolvedLabels;
	}

	/**
	 * Checks if the given toolbar uses variables at all.
	 * @param toolbar ToolbarSettings to check for variable usage
	 * @returns true if variables are used in the toolbar; false otherwise
	 */
	toolbarHasVars(toolbar: ToolbarSettings): boolean {
		return toolbar.items.some(item =>
			this.hasVars([item.label, item.tooltip, item.link].join(' '))
		);
	}

}
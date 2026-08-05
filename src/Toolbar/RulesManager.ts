import NoteToolbarPlugin from "main";
import { FrontMatterCache, ItemView, TFile } from "obsidian";
import { Rule, RuleCondition, RuleConjunction, RuleField, RuleOperator, ToolbarSettings } from "Settings/NoteToolbarSettings";

export default class RulesManager {
    
    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

	/**
	 * Gets the toolbar configured for the empty view, assuming we're actively in an empty view.
	 * @returns ToolbarSettings or undefined, if we're not in the empty view or there is no toolbar set
	 */
	public getEmptyViewToolbar(): ToolbarSettings | undefined {
		const itemView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
		if (itemView) {
			const renderToolbar = this.ntb.utils.hasToolbarForItemView(itemView);
			if (!renderToolbar) return;
			switch (itemView.getViewType()) {
				case 'webviewer':
					if (this.ntb.settings.webviewerToolbar) {
						return this.ntb.settingsManager.getToolbarById(this.ntb.settings.webviewerToolbar);
					}
					break;
				default:
					if (this.ntb.settings.emptyViewToolbar) {
						return this.ntb.settingsManager.getToolbarById(this.ntb.settings.emptyViewToolbar);
					}
					break;
			}
		}
		return undefined;
	}

    /**
     * Get toolbar for the given frontmatter (based on a toolbar prop), and failing that the file (based on folder mappings).
     * @param frontmatter FrontMatterCache to check if there's a prop for the toolbar.
     * @param file The note to check if we have a toolbar for.
     * @returns ToolbarSettings or undefined, if there is no matching toolbar.
     */
    public getMappedToolbar(frontmatter: FrontMatterCache | undefined, file: TFile): ToolbarSettings | undefined {

        // this.debug('getMappedToolbar');

        let matchingToolbar: ToolbarSettings | undefined = undefined;

        // this.debug('- frontmatter: ', frontmatter);
        // const propName = this.ntb.settings.toolbarProp;
        let ignoreToolbar = false;

        const notetoolbarProp = this.getToolbarNameFromProps(frontmatter);
        if (notetoolbarProp) {
            // if any prop = 'none' then don't return a toolbar
            ignoreToolbar = notetoolbarProp.includes('none') ? true : false;
            // is it valid? (i.e., is there a matching toolbar?)
            if (!ignoreToolbar) matchingToolbar = this.ntb.settingsManager.getToolbarByName(notetoolbarProp);
        }

        // we still don't have a matching toolbar
        if (!matchingToolbar && !ignoreToolbar) {

            matchingToolbar = this.getRuleToolbar(file);

            // check if the note is in a folder that's mapped, and if the mapping is valid
            // let mapping: FolderMapping;
            // let filePath: string;
            // for (let index = 0; index < this.ntb.settings.folderMappings.length; index++) {
            //     mapping = this.ntb.settings.folderMappings[index];
            //     filePath = file.parent?.path === '/' ? '/' : file.path.toLowerCase();
            //     // this.debug('getMatchingToolbar: checking folder mappings: ', filePath, ' startsWith? ', mapping.folder.toLowerCase());
            //     if (['*'].includes(mapping.folder) || filePath.toLowerCase().startsWith(mapping.folder.toLowerCase())) {
            //         // continue until we get a matching toolbar
            //         matchingToolbar = this.ntb.settingsManager.getToolbarById(mapping.toolbar);
            //         if (matchingToolbar) {
            //             // this.debug('  - matched toolbar:', matchingToolbar);
            //             break;
            //         }
            //     }
            // }

        }

        // use the configured default
        if (!matchingToolbar && !ignoreToolbar) {
            if (this.ntb.settings.defaultToolbar) {
                matchingToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.defaultToolbar);
            }
        }

        return matchingToolbar;

    }

	/**
	 * Gets the name of the toolbar from the props, if it exists.
	 * @param frontmatter props to check.
	 * @returns property value (the first value if it's a list type) or undefined.
	 */
	public getToolbarNameFromProps(frontmatter: FrontMatterCache | undefined): string | undefined {
		const propValue = frontmatter?.[this.ntb.settings.toolbarProp] as string | string[];
		if (Array.isArray(propValue)) {
			// if we're checking tags, make sure what's returned is a toolbar
			if (this.ntb.settings.toolbarProp === 'tags') {
				return propValue.find(tag =>
					this.ntb.settings.toolbars.some(tbar => tbar.name === tag)
				);
			}
			// otherwise, return the first value
			return propValue[0];
		}
		return typeof propValue === 'string' ? propValue : undefined;
	}


    // *****************************************************************************
    // RULES
    //******************************************************************************

    private getRuleToolbar(file: TFile): ToolbarSettings | undefined {
        // iterate rules in order, returning the first toolbar that matches
        for (const rule of this.ntb.settings.rules) {
            if (this.matchesRule(rule, file)) {
                const toolbar = this.ntb.settingsManager.getToolbarById(rule.toolbar);
                if (toolbar) return toolbar;
            }
        }

        return undefined;
    }

    private matchesRule(rule: Rule, file: TFile): boolean {
        const results = rule.conditions.map((condition) =>
            this.matchesCondition(condition, file)
        );

        return rule.conjunction === RuleConjunction.And
            ? results.every(Boolean)
            : results.some(Boolean);
    }

    private matchesCondition(condition: RuleCondition, file: TFile): boolean {
        if (!condition.field) return false;

        // check condition based on type
        switch (condition.field) {
            case RuleField.Folder:
                return this.matchesFolderCondition(condition, file);

            default:
                return false;
        }
    }

    // *****************************************************************************
    // CONDITION TYPES
    //******************************************************************************

    private matchesFolderCondition(condition: RuleCondition, file: TFile): boolean {
        if (typeof condition.value !== 'string') {
            return false;
        }

        const folder = file.parent?.path ?? '/';
        const path = folder.toLowerCase();
        const value = condition.value.toLowerCase();

        switch (condition.operator) {
            case RuleOperator.Is:
                return path === value;

            case RuleOperator.IsNot:
                return path !== value;

            case RuleOperator.Contains:
                return path.includes(value);

            case RuleOperator.DoesNotContain:
                return !path.includes(value);

            case RuleOperator.StartsWith:
                return path === value || path.startsWith(`${value}/`);

            case RuleOperator.EndsWith:
                return path.endsWith(value);

            case RuleOperator.IsEmpty:
                return path.length === 0;

            case RuleOperator.IsNotEmpty:
                return path.length > 0;

            default:
                return false;
        }
    }


}
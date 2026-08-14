import NoteToolbarPlugin from "main";
import { FrontMatterCache, ItemView, MarkdownView, Platform, TFile } from "obsidian";
import { RULE_OPERANDS, RULE_VALUE_TYPE_OTHER, Rule, RuleCondition, RuleConjunction, RuleField, RuleMatchType, RuleOperator, RuleValueEditor, ToolbarSettings, t } from "Settings/NoteToolbarSettings";
import { getUUID } from "Utils/Utils";

export default class RulesManager {
    
    constructor(
        private ntb: NoteToolbarPlugin
    ) {}

    /**
     * Duplicates the provided rule (but for a new, empty toolbar) and adds it to the end of the list of rules.
     * @param rule 
     */
    public async duplicateRule(rule: Rule) {
        const duplicatedRule: Rule = {
            ...rule,
            id: getUUID(),
            toolbar: '',
            conditions: rule.conditions.map((condition) => ({
                ...condition,
                id: getUUID(),
            }))
        };
        this.ntb.settings.rules.push(duplicatedRule);
        await this.ntb.settingsManager.save();
    }

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
    public getMappedToolbar(frontmatter: FrontMatterCache | undefined, file: TFile): 
        [toolbar: ToolbarSettings | undefined, matchType: RuleMatchType] 
    {

        let matchType: RuleMatchType;
        let matchingToolbar: ToolbarSettings | undefined = undefined;
        let ignoreToolbar = false;

        const notetoolbarProp = this.getToolbarNameFromProps(frontmatter);
        if (notetoolbarProp) {
            // if any prop = 'none' then don't return a toolbar
            ignoreToolbar = notetoolbarProp.includes('none') ? true : false;
            // is it valid? (i.e., is there a matching toolbar?)
            if (!ignoreToolbar) matchingToolbar = this.ntb.settingsManager.getToolbarByName(notetoolbarProp);
            if (ignoreToolbar || matchingToolbar) matchType = 'prop';
        }

        // we still don't have a matching toolbar
        if (!matchingToolbar && !ignoreToolbar) {
            let rule: Rule | undefined;
            [matchingToolbar, rule] = this.getRuleToolbar(file);
            if (matchingToolbar) matchType = rule;
        }

        // use the configured default
        if (!matchingToolbar && !ignoreToolbar) {
            if (this.ntb.settings.defaultToolbar) {
                matchingToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.defaultToolbar);
                if (matchingToolbar) matchType = 'default';
            }
        }

        return [matchingToolbar, matchType];

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

    private getRuleToolbar(file: TFile): [toolbar: ToolbarSettings | undefined, Rule: Rule | undefined] {
        // iterate rules in order, returning the first toolbar that matches
        for (const rule of this.ntb.settings.rules) {
            if (this.matchesRule(rule, file)) {
                const toolbar = this.ntb.settingsManager.getToolbarById(rule.toolbar);
                if (toolbar) return [toolbar, rule];
            }
        }

        return [undefined, undefined];
    }

    private matchesRule(rule: Rule, file: TFile): boolean {
        // there has to be conditions defined in order to match
        if (rule.conditions.length === 0) return false;

        const results = rule.conditions.map((condition) =>
            this.matchesCondition(condition, file)
        );

        return rule.conjunction === RuleConjunction.And
            ? results.every(Boolean)
            : results.some(Boolean);
    }

    private matchesCondition(condition: RuleCondition, file: TFile): boolean {
        // this.ntb.debug('matchesCondition: ', condition, ' for file: ', file.path);

        if (!condition.field) return false;

        // check condition based on type
        switch (condition.field) {
            case RuleField.EditorMode:
                return this.matchesEditorModeCondition(condition);

            case RuleField.FileName:
                return this.matchesFileNameCondition(condition, file);

            case RuleField.FileType:
                return this.matchesFileTypeCondition(condition);

            case RuleField.Folder:
                return this.matchesFolderCondition(condition, file);

            case RuleField.Platform:
                return this.matchesPlatformCondition(condition);

            case RuleField.Tag:
                return this.matchesTagsCondition(condition, file);

            default:
                return false;
        }
    }

    // *****************************************************************************
    // FORMATTING
    //******************************************************************************

    /**
     * Provides a string representation of a Rule's conditions, for the CLI and abbreviated Rules UI.
     * @param Rule 
     * @returns string representation of all conditions for the rule
     */
    formatRuleConditions(rule: Rule): string {
        const conditions = rule.conditions.filter(
            (condition) => condition.field && condition.operator
        );

        if (!conditions.length) {
            return '';
        }

        const formatted = conditions.map((condition) => this.formatRuleCondition(condition));

        return `${t('setting.rules.label-conjunction-if').toUpperCase()} ${formatted.join(` ${rule.conjunction.toUpperCase()} `)}`;
    }

    private formatRuleCondition(condition: RuleCondition): string {
        const operand = RULE_OPERANDS.find(
            (operand) =>
                operand.field === condition.field &&
                (!condition.key || operand.key === condition.key)
        );

        if (!operand || !condition.operator) {
            return '';
        }

        const operator = operand.operators.find(
            (operator) => operator.op === condition.operator
        );

        if (!operator) {
            return '';
        }

        const value = this.formatRuleValue(condition, operator.editor);

        return [
            operand.label,
            operator.label,
            value,
        ].filter(Boolean).join(' ');
    }

    private formatRuleValue(
        condition: RuleCondition,
        editor: RuleValueEditor
    ): string | undefined {

        if (condition.value === undefined) {
            return;
        }

        switch (editor) {
            case 'none':
                return;

            case 'tags': {
                const tags = Array.isArray(condition.value)
                    ? condition.value
                    : [String(condition.value)];

                return tags
                    .map((tag) => tag.startsWith('#') ? tag : `#${tag}`)
                    .join(', ');
            }

            case 'string':
            case 'file':
            case 'folder':
                return `"${String(condition.value)}"`;

            default:
                return condition.value === undefined
                    ? undefined
                    : String(condition.value);
        }
    }

    // *****************************************************************************
    // CONDITION TYPES
    //******************************************************************************

    private matchesEditorModeCondition(condition: RuleCondition): boolean {
        if (typeof condition.value !== 'string') return false;

        const mode = this.getEditorMode();

        switch (condition.operator) {
            case RuleOperator.Is:
                return mode === condition.value;

            case RuleOperator.IsNot:
                return mode !== condition.value;

            default:
                return false;
        }
    }

    private matchesFileNameCondition(condition: RuleCondition, file: TFile): boolean {
        const value = condition.value;

        switch (condition.operator) {
            case RuleOperator.IsEmpty:
                return file.basename.length === 0;

            case RuleOperator.IsNotEmpty:
                return file.basename.length > 0;
        }

            if (typeof value !== 'string' || value.length === 0) {
                return false;
            }

        const fileName = file.name.toLowerCase();
        const searchValue = value.toLowerCase();

        switch (condition.operator) {
            case RuleOperator.Is:
                return searchValue === '*' || fileName === searchValue;

            case RuleOperator.IsNot:
                return fileName !== searchValue;

            case RuleOperator.Contains:
                return fileName.includes(searchValue);

            case RuleOperator.DoesNotContain:
                return !fileName.includes(searchValue);

            case RuleOperator.StartsWith:
                return fileName.startsWith(searchValue);

            case RuleOperator.EndsWith:
                return fileName.endsWith(searchValue);

            default:
                return false;
        }
    }

    private matchesFileTypeCondition(
        condition: RuleCondition
    ): boolean {
        const activeView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        const viewType = activeView?.getViewType();

        const value = condition.value === RULE_VALUE_TYPE_OTHER
            ? condition.otherValue
            : condition.value;

        // this.ntb.debug(condition, value, viewType);

        if (typeof value !== 'string' || value.length === 0) {
            return false;
        }
        
        switch (condition.operator) {
            case RuleOperator.Is: {
                const isMatch = viewType === value;
                const isViewTypeSupported = this.ntb.utils.hasToolbarForViewType(value);
                if (isMatch && !isViewTypeSupported) {
                    this.ntb.error(t('setting.rules.error-file-type-disabled_view', { filetype: viewType }));
                }
                return isMatch;
            }

            case RuleOperator.IsNot:
                return viewType !== value;

            default:
                return false;
        }
    }

    private matchesFolderCondition(condition: RuleCondition, file: TFile): boolean {
        if (typeof condition.value !== 'string') {
            return false;
        }

        const folder = file.parent?.path ?? '/';
        const path = folder.toLowerCase();
        const value = condition.value.toLowerCase();

        switch (condition.operator) {
            case RuleOperator.Is:
                return value === '*' || path === value;

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

            default:
                return false;
        }
    }

    private matchesPlatformCondition(condition: RuleCondition): boolean {
        if (typeof condition.value !== 'string' || condition.value.length === 0) {
            return false;
        }

        const platform = !Platform.isMobile ? 'desktop' : (Platform.isTablet ? 'tablet' : 'phone');

        switch (condition.operator) {
            case RuleOperator.Is:
                return condition.value === 'mobile'
                    ? Platform.isMobile
                    : platform === condition.value;

            case RuleOperator.IsNot:
                return condition.value === 'mobile'
                    ? !Platform.isMobile
                    : platform !== condition.value;

            default:
                return false;
        }
    }

    private matchesTagsCondition(condition: RuleCondition, file: TFile): boolean {
        const fileCache = this.ntb.app.metadataCache.getFileCache(file);
        if (!fileCache) return false;
        const fileTags = fileCache.frontmatter?.tags as string[] | undefined;
        if (!fileTags) return false;

        switch (condition.operator) {
            case RuleOperator.IsEmpty:
                return fileTags.length === 0;

            case RuleOperator.IsNotEmpty:
                return fileTags.length > 0;
        }

        if (typeof condition.value !== 'string' || condition.value.length === 0) {
            return false;
        }

        const normalizeTag = (tag: string): string => tag.replace(/^#/, '').toLowerCase();

        const normalizedValue = normalizeTag(condition.value);

        switch (condition.operator) {
            case RuleOperator.Contains:
                return fileTags.some((tag) => normalizeTag(tag).includes(normalizedValue));

            case RuleOperator.DoesNotContain:
                return fileTags.every((tag) => !normalizeTag(tag).includes(normalizedValue));

            default:
                return false;
        }
    }

    // *****************************************************************************
    // UTILITIES
    //******************************************************************************

    private getEditorMode(): string | undefined {
        const activeView = this.ntb.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return undefined;
        // const isSourceMode = activeView?.getState().source;
        return activeView.getMode();
    }

}
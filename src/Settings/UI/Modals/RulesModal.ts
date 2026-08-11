import { FILE_TYPE_OPTIONS, FileType, PLATFORM_OPTIONS, PlatformType, Rule, RULE_OPERANDS, RULE_VALUE_TYPE_OTHER, RuleCondition, RuleConjunction, RuleField, RuleOperator, SettingType, t, UiSelectOption, VIEW_MODE_OPTIONS, ViewType } from "Settings/NoteToolbarSettings";
import { arraymove, getElementPosition, getUUID, moveElement } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { ButtonComponent, debounce, Menu, MenuItem, Modal, Notice, Setting } from "obsidian";
import Sortable from "sortablejs";
import FileSuggester from "../Suggesters/FileSuggester";
import FolderSuggester from "../Suggesters/FolderSuggester";
import TagSuggester from "../Suggesters/TagSuggester";
import ToolbarSuggester from "../Suggesters/ToolbarSuggester";
import { iconTextFr, learnMoreFr } from "../Utils/SettingsUIUtils";

export default class RulesModal extends Modal {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
        super(ntb.app);
    }

    public onOpen() {
        this.setTitle(t('setting.rules.name-modal'));
		this.modalEl.addClass('note-toolbar-setting-modal-container');
        this.display();
    }
    
    /**
     * Displays rules for displaying toolbars.
     */
    public display() {

        this.contentEl.empty();

        new Setting(this.contentEl)
            .setDesc(learnMoreFr(t('setting.rules.description-modal', { property: this.ntb.settings.toolbarProp }), 'Defining-where-to-show-toolbars'));

        //
        // property
        //

        const propertySetting = new Setting(this.contentEl)
            .setName(t('setting.display-rules.option-property'))
            .setDesc(t('setting.display-rules.option-property-description'))
            .addText(text => text
                .setPlaceholder(t('setting.display-rules.option-property-placeholder'))
                .setValue(this.ntb.settings.toolbarProp)
                .onChange(debounce(async (value) => {
                    this.ntb.settings.toolbarProp = value;
                    // FIXME? set all toolbars to updated?
                    // this.plugin.settings.toolbars.updated = new Date().toISOString();
                    await this.saveAndUpdateActiveRule();	
                }, 750)));
        propertySetting.controlEl.setAttr('data-ntb-field-prop', '');

        //
        // rules
        //

        this.renderRules();

        //
        // default toolbar
        //

        const existingDefaultToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.defaultToolbar);
        const defaultToolbarSetting = new Setting(this.contentEl)
            .setName(t('setting.display-rules.option-default'))
            .setDesc(t('setting.display-rules.option-default-description'))
            .setClass('note-toolbar-setting-item-control-std-with-help')
            .addSearch(async (cb) => {
                new ToolbarSuggester(this.ntb, cb.inputEl);
                cb.setPlaceholder(t('setting.display-rules.option-default-placeholder'))
                    .setValue(existingDefaultToolbar ? existingDefaultToolbar.name : '')
                    .onChange(debounce(async (name) => {
                        const isValid = await this.ntb.settingsUtils.updateItemComponentStatus(this, name, SettingType.Toolbar, defaultToolbarSetting.controlEl, undefined, 'beforeend');
                        const newToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
                        this.ntb.settings.defaultToolbar = newToolbar?.uuid ?? null;
                        this.ntb.settingsUtils.setFieldPreview(defaultToolbarSetting, newToolbar);
                        await this.saveAndUpdateActiveRule();
                    }, 250));
                await this.ntb.settingsUtils.updateItemComponentStatus(this, existingDefaultToolbar ? existingDefaultToolbar.name : '', SettingType.Toolbar, cb.inputEl.parentElement, undefined, 'beforeend');
            });
        this.ntb.settingsUtils.setFieldPreview(defaultToolbarSetting, existingDefaultToolbar);
        defaultToolbarSetting.controlEl.setAttr('data-ntb-field-default', '');

    }

    /**
     * Renders the rules section.
     */
    private renderRules() {

        new Setting(this.contentEl)
            .setName(t('setting.rules.name'))
            .setDesc(t('setting.rules.description'));

        const rulesContainerEl = this.contentEl.createDiv();
        rulesContainerEl.addClasses(['note-toolbar-setting-rules-container', 'note-toolbar-setting-top-border', 'note-toolbar-setting-ui']);

        const ruleListEl = rulesContainerEl.createDiv();
        ruleListEl.addClass('note-toolbar-sortablejs-list');
        
        // add all the rules
        if (this.ntb.settings.rules.length > 0) {
            void Promise.all(
                this.ntb.settings.rules.map((rule) => this.renderRuleForm(rule))
            ).then((elements) => {
                ruleListEl.append(...elements);
                this.updateActiveRule();
            });
        }

        // make the list sortable
        Sortable.create(ruleListEl, {
            chosenClass: 'sortable-chosen',
            ghostClass: 'sortable-ghost',
            handle: '.sortable-handle',
            onChange: (item) => navigator.vibrate(50),
            onChoose: (item) => navigator.vibrate(50),
            onSort: (item) => {
                this.ntb.debug("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
                if (item.oldIndex !== undefined && item.newIndex !== undefined) {
                    moveElement(this.ntb.settings.rules, item.oldIndex, item.newIndex);
                    void this.saveAndUpdateActiveRule();
                }
            }
        });

        // add rule button

        new Setting(rulesContainerEl)
            .setClass("note-toolbar-setting-button")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.rules.button-new'))
                    .setTooltip(t('setting.rules.button-new-tooltip'))
                    .setCta()
                    .onClick(async () => {
                        // show a message if all toolbars have rules assigned
                        const toolbarsWithRules = new Set(
                            this.ntb.settings.rules.map((rule) => rule.toolbar)
                        );
                        const availableToolbars = this.ntb.settings.toolbars.filter(
                            (toolbar) => !toolbarsWithRules.has(toolbar.uuid)
                        );
                        if (availableToolbars.length === 0) {
                            new Notice(t('setting.rules.notice-all-toolbars-used')).containerEl.addClass('mod-warning');
                            return;
                        }
                        // create the rule
                        const newRule: Rule = {
                            id: getUUID(),
                            conjunction: RuleConjunction.And,
                            conditions: [],
                            toolbar: ''
                        };
                        this.ntb.settings.rules.push(newRule);
                        const ruleFormEl = await this.renderRuleForm(newRule);
                        ruleListEl.appendChild(ruleFormEl);
                        await this.ntb.settingsManager.save();
                    });
                button.buttonEl.setText(iconTextFr('plus', t('setting.rules.button-new')));
            });

    }

    /**
     * Returns the form to edit a rule.
     * @param rule ToolbarRule to return the form for
     * @returns the form element as a div
     */
    async renderRuleForm(rule: Rule): Promise<HTMLDivElement> {

        const ruleContainerEl = createDiv();
        ruleContainerEl.className = "note-toolbar-setting-rules-list-item-container";
        ruleContainerEl.setAttribute('data-row-id', rule.id);

        const ruleEl = ruleContainerEl.createDiv({ cls: 'note-toolbar-setting-rule' });
        const conditionContainerEl = ruleContainerEl.createDiv({ cls: 'note-toolbar-setting-condition-container' });

        //
        // toolbar name field
        //

        const nameConjunctionContainerEl = ruleEl.createDiv({ cls: 'note-toolbar-setting-rule-name-conjunction' });

        const existingToolbarSetting = this.ntb.settingsManager.getToolbarById(rule.toolbar);
        const toolbarSetting = new Setting(nameConjunctionContainerEl)
            .setClass('note-toolbar-setting-mapping-field')
            .setClass('note-toolbar-setting-mapping-toolbar')
            .setClass('note-toolbar-setting-item-control-std-with-help')
            .addSearch(async (cb) => {
                // do not show toolbars already used in other rules
                new ToolbarSuggester(this.ntb, cb.inputEl, (toolbar) => {
                    const toolbarsWithRules = new Set<string>(
                        this.ntb.settings.rules.map((rule) => rule.toolbar)
                    );
                    return !toolbarsWithRules.has(toolbar.uuid);
                });
                cb.setPlaceholder(t('setting.rules.placeholder-toolbar'))
                    .setValue(existingToolbarSetting ? existingToolbarSetting.name : '')
                    .onChange(debounce(async (name) => {
                        const isValid = await this.ntb.settingsUtils.updateItemComponentStatus(this, name, SettingType.Toolbar, toolbarSetting.controlEl, undefined, 'beforeend');
                        const mappedToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
                        rule.toolbar = mappedToolbar?.uuid ?? '';
                        this.ntb.settingsUtils.setFieldPreview(toolbarSetting, mappedToolbar);
                        // add the initial condition
                        if (isValid && rule.conditions.length === 0) {
                            const newCondition: RuleCondition = {
                                id: getUUID(),
                                field: RuleField.FileName,
                                operator: RuleOperator.Contains
                            };
                            rule.conditions.push(newCondition);
                            const ruleConditionEl = await this.renderConditionForm(rule, newCondition);
                            conditionContainerEl.appendChild(ruleConditionEl);
                        }
                        await this.saveAndUpdateActiveRule();
                    }, 250));
                await this.ntb.settingsUtils.updateItemComponentStatus(
                    this, existingToolbarSetting ? existingToolbarSetting.name : '', SettingType.Toolbar, cb.inputEl.parentElement, undefined, 'beforeend'
                );
            });
        this.ntb.settingsUtils.setFieldPreview(toolbarSetting, existingToolbarSetting);

        //
        // rule conjunction
        //

        const CONJUNCTION_OPTIONS: Record<string, string> = {
            [RuleConjunction.And]: t('setting.rules.option-conjunction-and'),
            [RuleConjunction.Or]: t('setting.rules.option-conjunction-or'),
        };

        new Setting(nameConjunctionContainerEl)
            .setClass('note-toolbar-setting-mapping-conjunction')
            .setClass('note-toolbar-setting-item-text-style')
            .addDropdown((cb) => {
                cb.addOptions(CONJUNCTION_OPTIONS)
                    .setValue(rule.conjunction)
                    .onChange(debounce(async (value) => {
                        rule.conjunction = value as RuleConjunction;
                        await this.saveAndUpdateActiveRule();
                        this.display();
                    }, 250));
            });

        //
        // rule drag handle
        //

        const ruleControlsEl = ruleEl.createDiv();
        ruleControlsEl.addClass("note-toolbar-setting-item-controls");

        new Setting(ruleControlsEl)
            .addExtraButton((cb) => {
                cb.setIcon('ellipsis')
                    .setTooltip(t('setting.rules.tooltip-options'))
                    .onClick(() => {
                        const menu = new Menu();
                        menu.addItem((item: MenuItem) => {
                            item
                                .setTitle(t('setting.rules.button-delete-rule-tooltip'))
                                .setWarning(true)
                                .setIcon('trash')
                                .onClick(async () => {
                                    const rowId = cb.extraSettingsEl.getAttribute('data-row-id');
                                    if (rowId) await this.listMoveHandlerById(null, rowId, 'delete');
                                    const ruleEl = this.contentEl.querySelector(`.note-toolbar-setting-rules-list-item-container[data-row-id="${rowId}"]`);
                                    if (ruleEl) ruleEl.remove();
                                });
                        });
                        menu.showAtPosition(getElementPosition(cb.extraSettingsEl));
                    });
                cb.extraSettingsEl.setAttribute('data-row-id', rule.id);
            })
            .addExtraButton((cb) => {
                cb.setIcon('grip-horizontal')
                    .setTooltip(t('setting.button-drag-tooltip'))
                    .extraSettingsEl.addClass('sortable-handle');
                cb.extraSettingsEl.setAttribute('data-row-id', rule.id);
                cb.extraSettingsEl.tabIndex = 0;
                this.ntb.registerDomEvent(
                    cb.extraSettingsEl,	'keydown', async (e) => {
                        const currentEl = e.target as HTMLElement;
                        const rowId = currentEl.getAttribute('data-row-id');
                        if (rowId) await this.listMoveHandlerById(e, rowId);
                    });
            });

        //
        // show existing conditions
        //

        for (const condition of rule.conditions) {
            const conditionEl = await this.renderConditionForm(rule, condition);
            conditionContainerEl.append(conditionEl);
        }

        //
        // add condition button
        //

        new Setting(ruleContainerEl)
            .setClass("note-toolbar-setting-text-button")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.rules.button-newcondition'))
                    .setTooltip(t('setting.rules.button-newcondition-tooltip'))
                    .onClick(async () => {
                        const newCondition: RuleCondition = {
                            id: getUUID(),
                            field: RuleField.FileName,
                            operator: RuleOperator.Contains
                        };
                        rule.conditions.push(newCondition);
                        // add the condition UI
                        const ruleConditionEl = await this.renderConditionForm(rule, newCondition);
                        conditionContainerEl.appendChild(ruleConditionEl);
                        await this.ntb.settingsManager.save();
                    });
                button.buttonEl.setText(iconTextFr('plus', t('setting.rules.button-newcondition')));
            });

        return ruleContainerEl;

    }

    /**
     * Returns the form to edit a condition.
     * @param condition ToolbarRuleCondition to return the form for
     * @returns the form element as a div
     */
    async renderConditionForm(rule: Rule, condition: RuleCondition): Promise<HTMLDivElement> {
        
        const conditionEl = createDiv();
        conditionEl.className = "note-toolbar-setting-condition";
        conditionEl.setAttribute('data-row-id', condition.id);

        // operands
        const ruleOperandOptions = Object.fromEntries(
            [...RULE_OPERANDS]
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((operand) => [
                    operand.id,
                    operand.label
                ])
        );

        new Setting(conditionEl)
            .setName(rule.conjunction === RuleConjunction.And ? t('setting.rules.condition-field-prefix-and') : t('setting.rules.condition-field-prefix-or'))
            .setClass('note-toolbar-setting-mapping-field')
            .setClass('note-toolbar-setting-item-text-style')
            .addDropdown((cb) => {
                cb
                    .addOptions(ruleOperandOptions)
                    .setValue(
                        RULE_OPERANDS.find((operand) =>
                            operand.field === condition.field &&
                            operand.key === condition.key
                        )?.id ?? ''
                    )
                    .onChange(debounce(async (id) => {
                        const operand = RULE_OPERANDS.find( (operand) => operand.id === id );
                        if (!operand) return;
                        // set condition based on id selected
                        condition.field = operand.field;
                        condition.key = operand.key;
                        condition.operator = operand.operators[0].op;
                        condition.value = undefined;
                        await this.saveAndUpdateActiveRule();
                        // re-render the condition for the selected operand
                        conditionEl.replaceWith(await this.renderConditionForm(rule, condition));
                    }, 250));
            });

        //
        // operator
        //

        const operatorValueContainerEl = conditionEl.createDiv();
        operatorValueContainerEl.addClass('note-toolbar-setting-mapping-operator-value');
        
        const operand = RULE_OPERANDS.find((operand) =>
            operand.field === condition.field &&
            operand.key === condition.key
        );

        if (operand) {
            const operatorOptions = Object.fromEntries(
                [...operand.operators]
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((definition) => [
                        definition.op,
                        definition.label
                    ])
            );

            new Setting(operatorValueContainerEl)
                .setClass('note-toolbar-setting-mapping-operator')
                .addDropdown((cb) => {
                    cb
                        .addOptions(operatorOptions)
                        .setValue(condition.operator ?? '')
                        .onChange(debounce(async (value) => {
                            condition.operator = value as RuleOperator;
                            condition.value = undefined;

                            await this.saveAndUpdateActiveRule();

                            conditionEl.replaceWith(await this.renderConditionForm(rule, condition));
                        }, 250));
                });
        }

        //
        // value
        //

        // const VALUE_EDITORS: Record<RuleValueEditor, ValueEditorRenderer> = {
        //     string: renderStringEditor,
        //     folder: renderFolderEditor,
        //     tag: renderTagEditor,
        //     platform: renderPlatformEditor,
        //     editormode: renderEditorModeEditor
        // };

        const operatorDefinition = operand?.operators.find(
            (definition) => definition.op === condition.operator
        );

        if (operatorDefinition) {
            switch (operatorDefinition.editor) {
                case 'editormode':
                    if (!condition.value) condition.value ??= ViewType.Preview;
                    new Setting(operatorValueContainerEl)
                        .setClass('note-toolbar-setting-mapping-value')
                        .addDropdown((dropdown) => {
                            dropdown
                                .addOptions(this.toDropdownOptions(VIEW_MODE_OPTIONS))
                                .setValue(condition.value as string)
                                .onChange(async (value) => {
                                    condition.value = value;
                                    await this.saveAndUpdateActiveRule();
                                });
                        });
                    break;

                case 'file':
                    new Setting(operatorValueContainerEl)
                        .setClass('note-toolbar-setting-mapping-value')
                        .addSearch((cb) => {
                            new FileSuggester(this.ntb, cb.inputEl, true, true);
                            cb
                                .setPlaceholder(t('setting.rules.condition-value-file-placeholder'))
                                .setValue((condition.value as string) ?? '')
                                .onChange(debounce(async (value) => {
                                    condition.value = value;
                                    await this.saveAndUpdateActiveRule();
                                }, 250));
                        });
                    break;

                case 'filetype':
                    if (!condition.value) condition.value ??= FileType.Bases;
                    new Setting(operatorValueContainerEl)
                        .setClass('note-toolbar-setting-mapping-value')
                        .addDropdown((dropdown) => {
                            dropdown
                                .addOptions({
                                    ...this.toDropdownOptions(FILE_TYPE_OPTIONS),
                                    [RULE_VALUE_TYPE_OTHER]: t('setting.rules.option-other'),
                                })
                                .setValue(condition.value as string)
                                .onChange(debounce(async (value) => {
                                    condition.value = value;
                                    if (value !== RULE_VALUE_TYPE_OTHER) {
                                        condition.otherValue = '';
                                    }
                                    await this.saveAndUpdateActiveRule();
                                    conditionEl.replaceWith(
                                        await this.renderConditionForm(rule, condition)
                                    );
                                }, 250));
                        });

                    if (condition.value === RULE_VALUE_TYPE_OTHER) {
                        this.renderOtherValueSetting(operatorValueContainerEl, condition);
                    }
                    break;

                case 'folder':
                    new Setting(operatorValueContainerEl)
                        .setClass('note-toolbar-setting-mapping-value')
                        .addSearch((cb) => {
                            new FolderSuggester(this.ntb.app, cb.inputEl);
                            cb
                                .setPlaceholder(t('setting.rules.condition-value-folder-placeholder'))
                                .setValue((condition.value as string) ?? '')
                                .onChange(debounce(async (value) => {
                                    condition.value = value;
                                    await this.saveAndUpdateActiveRule();
                                }, 250));
                        });
                    break;

                case 'none':
                    // do nothing: no value needed for this condition
                    break;

                case 'platform':
                    if (!condition.value) condition.value ??= PlatformType.Mobile;
                    new Setting(operatorValueContainerEl)
                        .setClass('note-toolbar-setting-mapping-value')
                        .addDropdown((dropdown) => {
                            dropdown
                                .addOptions(this.toDropdownOptions(PLATFORM_OPTIONS))
                                .setValue(condition.value as string)
                                .onChange(async (value) => {
                                    condition.value = value;
                                    await this.saveAndUpdateActiveRule();
                                });
                        });
                    break;

                case 'tags':
                    new Setting(operatorValueContainerEl)
                        .setClass('note-toolbar-setting-mapping-value')
                        .addSearch((cb) => {
                            new TagSuggester(this.ntb, cb.inputEl);
                            cb
                                .setPlaceholder(t('setting.rules.condition-value-tags-placeholder'))
                                .setValue((condition.value as string) ?? '')
                                .onChange(debounce(async (value) => {
                                    condition.value = value;
                                    await this.saveAndUpdateActiveRule();
                                }, 250));
                        });
                    break;

                case 'string':
                    new Setting(operatorValueContainerEl)
                        .setClass('note-toolbar-setting-mapping-value')
                        .addText((cb) => {
                            cb
                                .setPlaceholder(t('setting.rules.condition-value-string-placeholder'))
                                .setValue((condition.value as string) ?? '')
                                .onChange(debounce(async (value) => {
                                    condition.value = value;
                                    await this.saveAndUpdateActiveRule();
                                }, 250));
                        });
                    break;
            }
        }

        //
        // delete condition button
        //

        new Setting(operatorValueContainerEl)
            .setClass("note-toolbar-setting-item-delete")
            .addButton((cb) => {
                cb.setIcon("trash")
                    .setTooltip(t('setting.rules.button-delete-condition-tooltip'))
                    .onClick(async () => {
                        const rowId = cb.buttonEl.getAttribute('data-row-id');
                        if (rowId) {
                            this.removeConditionById(rowId);
                            await this.saveAndUpdateActiveRule();
                            const conditionEl = this.contentEl.querySelector(`.note-toolbar-setting-condition[data-row-id="${rowId}"]`);
                            if (conditionEl) conditionEl.remove();
                        }
                    });
                cb.buttonEl.setAttribute('data-row-id', condition.id);
            });

        await this.saveAndUpdateActiveRule();
        return conditionEl;

    }

    private renderOtherValueSetting(
        containerEl: HTMLElement,
        condition: RuleCondition
    ): HTMLElement {
        return new Setting(containerEl)
            .setClass('note-toolbar-setting-mapping-value')
            .addText((text) => {
                text
                    .setPlaceholder(t('setting.rules.placeholder-other-filetype'))
                    .setValue(condition.otherValue ?? '')
                    .onChange(async (value) => {
                        condition.otherValue = value;
                        await this.saveAndUpdateActiveRule();
                    });
            })
            .settingEl;
    }

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

    private async saveAndUpdateActiveRule() {
        await this.ntb.settingsManager.save();
        this.updateActiveRule();
    }

    /**
     * Highlights the Rule row for the toolbar that matches the active file.
     */
    private updateActiveRule() {

        const ACTIVE_RULE_CLASS = 'note-toolbar-setting-rule-active';
        this.contentEl.querySelector(`.${ACTIVE_RULE_CLASS}`)?.removeClass(ACTIVE_RULE_CLASS);

        const activeFile = this.ntb.app.workspace.getActiveFile();
        if (!activeFile) return;
        const frontmatterCache = this.ntb.app.metadataCache.getFileCache(activeFile)?.frontmatter;
        if (!frontmatterCache) return;
        
        const [, matchType] = this.ntb.rules.getMappedToolbar(frontmatterCache, activeFile);
        // this.ntb.debug('getActiveRule: toolbar', mappedToolbar, '⭐️ matches:', matchType);

        let cssSelector;
        switch (matchType) {
            case 'default':
                cssSelector = `[data-ntb-field-default]`;
                break;
            case 'prop':
                cssSelector = `[data-ntb-field-prop]`;
                break;
            default:
                if (typeof matchType === 'object' && matchType !== null) {
                    cssSelector = `[data-row-id="${matchType.id}"]`;
                }
                break;
        }
        if (cssSelector) {
            const ruleEl = this.contentEl.querySelector(cssSelector);
            this.ntb.debug(ruleEl);
            if (!ruleEl) return;
            ruleEl.toggleClass(ACTIVE_RULE_CLASS, true);
        }

    }

    removeConditionById(conditionId: string): boolean {
        for (const rule of this.ntb.settings.rules) {
            const index = rule.conditions.findIndex((condition) => condition.id === conditionId);
            if (index !== -1) {
                rule.conditions.splice(index, 1);
                return true;
            }
        }
        return false;
    }

	getIndexByRowId(rowId: string): number {
		const list = this.getItemListEls();
		return Array.prototype.findIndex.call(list, (el: Element) => el.getAttribute('data-row-id') === rowId);
	}

	getItemListEls(): NodeListOf<HTMLElement> {
		return this.containerEl.querySelectorAll('.note-toolbar-sortablejs-list > div[data-row-id]');
	}

    /**
     * Handles moving mappings up and down the list, and deletion, based on click or keyboard event.
     * @param keyEvent KeyboardEvent, if the keyboard is triggering this handler.
     * @param index Number of the item in the list we're moving/deleting.
     * @param action Direction of the move, "delete", or don't provided if just checking the keyboard for the action
     */
    async listMoveHandler(keyEvent: KeyboardEvent | null, index: number, action?: 'up' | 'down' | 'delete'): Promise<void> {
        if (keyEvent) {
            switch (keyEvent.key) {
                case 'ArrowUp':
                    keyEvent.preventDefault();
                    action = 'up';
                    break;
                case 'ArrowDown':
                    keyEvent.preventDefault();
                    action = 'down';
                    break;
                case 'Delete':
                case 'Backspace':
                    keyEvent.preventDefault();
                    action = 'delete';	
                    break;
                case 'Enter':
                case ' ':
                    keyEvent.preventDefault();
                    break;
                default:
                    return;
            }
        }
        switch (action) {
            case 'up':
                arraymove(this.ntb.settings.rules, index, index - 1);
                break;
            case 'down':
                arraymove(this.ntb.settings.rules, index, index + 1);
                keyEvent?.preventDefault();
                break;
            case 'delete':
                this.ntb.settings.rules.splice(index, 1);
                keyEvent?.preventDefault();
                break;
        }
        await this.saveAndUpdateActiveRule();
    }

	async listMoveHandlerById(
		keyEvent: KeyboardEvent | null, 
		rowId: string,
		action?: 'up' | 'down' | 'delete'
	): Promise<void> {	
		const itemIndex = this.getIndexByRowId(rowId);
		// this.plugin.debug("listMoveHandlerById: moving index:", itemIndex);
		await this.listMoveHandler(keyEvent, itemIndex, action);
	}

    toDropdownOptions<T extends string>(options: UiSelectOption<T>[]): Record<string, string> {
        return Object.fromEntries(
            options.map((option) => [
                option.type,
                option.label
            ])
        );
    }

}
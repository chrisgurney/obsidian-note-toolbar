import { FILE_TYPE_OPTIONS, FileType, NONE_TOOLBAR_ID, PLATFORM_OPTIONS, PlatformType, Rule, RULE_OPERANDS, RULE_VALUE_TYPE_OTHER, RuleCondition, RuleConjunction, RuleField, RuleOperator, SettingType, t, UiSelectOption, VIEW_MODE_OPTIONS, ViewType } from "Settings/NoteToolbarSettings";
import { arraymove, getElementPosition, getUUID, moveElement } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { ButtonComponent, debounce, ItemView, Menu, MenuItem, Modal, Notice, Platform, Setting, SettingGroup, setTooltip } from "obsidian";
import Sortable from "sortablejs";
import FileSuggester from "../Suggesters/FileSuggester";
import FolderSuggester from "../Suggesters/FolderSuggester";
import RuleOperandSuggester from "../Suggesters/RuleOperandSuggester";
import TagSuggester from "../Suggesters/TagSuggester";
import ToolbarSuggester from "../Suggesters/ToolbarSuggester";
import { iconTextFr, learnMoreFr, removeFieldErrors } from "../Utils/SettingsUIUtils";

export default class RulesModal extends Modal {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
        super(ntb.app);
    }

    public onOpen() {
        this.display();
    }
    
    /**
     * Displays rules for displaying toolbars.
     */
    public display() {

        this.setTitle(t('setting.rules.name-modal'));
		this.modalEl.addClass('note-toolbar-setting-modal-container', 'note-toolbar-setting-modal-phone-bottom-inset-fix');

        this.contentEl.empty();

        const activeFileName = this.ntb.app.workspace.getActiveFile()?.basename;
        const modalDescFr = new DocumentFragment();
        modalDescFr.append(learnMoreFr(t('setting.rules.description-modal'), 'Defining-where-to-show-toolbars'));
        if (activeFileName) {
            modalDescFr.append(
                createEl('br'),
                createSpan({
                    text: t('setting.rules.description-active-file', { filename: activeFileName }),
                    cls: 'note-toolbar-setting-text-active'
                })
            );
        }
        new Setting(this.contentEl)
            .setDesc(modalDescFr);

        //
        // property
        //

        const propertySetting = new Setting(this.contentEl)
            .setName(t('setting.rules.setting-property'))
            .setDesc(t('setting.rules.setting-property-description'))
            .addText(text => text
                .setPlaceholder(t('setting.rules.setting-property-placeholder'))
                .setValue(this.ntb.settings.toolbarProp)
                .onChange(debounce(async (value) => {
                    this.ntb.settings.toolbarProp = value;
                    // FIXME? set all toolbars to updated?
                    // this.plugin.settings.toolbars.updated = new Date().toISOString();
                    await this.saveAndUpdateActiveRule();	
                }, 750)));
        propertySetting.controlEl.setAttr('data-ntb-field-prop', '');

        //
        // default toolbar
        //

        const existingDefaultToolbar = this.ntb.settingsManager.getToolbarById(this.ntb.settings.defaultToolbar);
        const defaultToolbarSetting = new Setting(this.contentEl)
            .setName(t('setting.rules.setting-default'))
            .setDesc(t('setting.rules.setting-default-description'))
            .setClass('note-toolbar-setting-item-control-std-with-help')
            .addSearch(async (cb) => {
                new ToolbarSuggester(this.ntb, cb.inputEl);
                cb.setPlaceholder(t('setting.rules.setting-default-placeholder'))
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

        //
        // rules
        //

        this.renderRules();

        //
        // done button
        //

		new Setting(this.contentEl)
			.addButton((btn: ButtonComponent) => {
				btn.setButtonText(t('setting.rules.button-close'))
					.setCta()
					.setTooltip(t('setting.rules.button-close-description'))
					.onClick(async () => {
                        await this.ntb.settingsManager.save();
						this.close();
					});
			});

        this.updateActiveRule(true);

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

        const rulesSettingGroup = new SettingGroup(rulesContainerEl);

        const ruleListEl = Platform.isDesktop ? rulesSettingGroup.listEl : rulesContainerEl.createDiv();
        ruleListEl.addClass('note-toolbar-sortablejs-list');
        
        // add all the rules
        this.ntb.settings.rules.map((rule) => {
            const ruleFormEl = this.renderRuleForm(rule)
            ruleListEl.append(ruleFormEl);
        });

        this.renderAddRuleButton(rulesContainerEl, ruleListEl);

        // make the list sortable
        Sortable.create(ruleListEl, {
            chosenClass: 'sortable-chosen',
            ghostClass: 'sortable-ghost',
            handle: '.sortable-handle',
            onChange: (item) => navigator.vibrate(50),
            onChoose: (item) => navigator.vibrate(50),
            onSort: (item) => {
                // this.ntb.debug("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
                if (item.oldIndex !== undefined && item.newIndex !== undefined) {
                    moveElement(this.ntb.settings.rules, item.oldIndex, item.newIndex);
                    void this.saveAndUpdateActiveRule();
                }
            }
        });

    }

    /**
     * Renders the add rule button.
     */
    renderAddRuleButton(addRuleContainerEl: HTMLElement, ruleListEl: HTMLElement) {

        new Setting(addRuleContainerEl)
            .setClass("note-toolbar-setting-button")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.rules.button-new'))
                    .setTooltip(t('setting.rules.button-new-tooltip'))
                    .setCta()
                    .onClick(async () => {
                        // create the rule and initial condition
                        const newRule: Rule = {
                            id: getUUID(),
                            conjunction: RuleConjunction.And,
                            conditions: [{
                                id: getUUID(),
                                field: RuleField.FileName,
                                operator: RuleOperator.Contains
                            }],
                            toolbar: ''
                        };
                        this.ntb.settings.rules.push(newRule);
                        const ruleFormEl = this.renderRuleForm(newRule);
                        ruleFormEl.toggleAttribute('data-visible', true);
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
    renderRuleForm(rule: Rule): HTMLDivElement {

        const ruleContainerEl = createDiv();
        ruleContainerEl.className = "note-toolbar-setting-rules-list-item-container";
        ruleContainerEl.setAttribute('data-row-id', rule.id);

        const ruleEl = ruleContainerEl.createDiv({ cls: 'note-toolbar-setting-rule' });
        const conditionsSectionEl = ruleContainerEl.createDiv({ cls: 'note-toolbar-setting-conditions-section' });
        const conditionContainerEl = conditionsSectionEl.createDiv({ cls: 'note-toolbar-setting-condition-container' });

        // rule preview
        this.addRulePreview(ruleEl, rule, ruleContainerEl);
        
        // toolbar name + conjunction
        const nameConjunctionEl = this.renderNameConjunction(rule, ruleContainerEl);
        ruleEl.append(nameConjunctionEl);

        // rule controls (drag + menu)
        this.addRuleControls(ruleEl, rule, ruleContainerEl);

        // show existing conditions
        for (const condition of rule.conditions) {
            const conditionEl = this.renderConditionForm(rule, condition);
            conditionContainerEl.append(conditionEl);
        }

        // add condition button
        new Setting(conditionsSectionEl)
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
                        const ruleConditionEl = this.renderConditionForm(rule, newCondition);
                        conditionContainerEl.appendChild(ruleConditionEl);
                        await this.saveAndUpdateActiveRule();
                    });
                button.buttonEl.setText(iconTextFr('plus', t('setting.rules.button-newcondition')));
            });

        return ruleContainerEl;

    }

    renderNameConjunction(rule: Rule, ruleContainerEl: HTMLElement): HTMLElement {

        const nameConjunctionContainerEl = createDiv({ cls: 'note-toolbar-setting-rule-name-conjunction' });

        const existingToolbarSetting = this.ntb.settingsManager.getToolbarById(rule.toolbar);
        const toolbarSetting = new Setting(nameConjunctionContainerEl)
            .setClass('note-toolbar-setting-mapping-field')
            .setClass('note-toolbar-setting-mapping-toolbar')
            .setClass('note-toolbar-setting-item-control-std-with-help')
            .addSearch(async (cb) => {
                new ToolbarSuggester(this.ntb, cb.inputEl, true,
                    async (toolbar) => {
                        let isValid = false;
                        if (toolbar.uuid === NONE_TOOLBAR_ID) {
                            isValid = true;
                        }
                        else {
                            isValid = await this.ntb.settingsUtils.updateItemComponentStatus(this, toolbar.name, SettingType.Toolbar, toolbarSetting.controlEl, undefined, 'beforeend');
                        }
                        const mappedToolbar = isValid ? toolbar : undefined;
                        rule.toolbar = mappedToolbar?.uuid ?? '';
                        this.ntb.settingsUtils.setFieldPreview(toolbarSetting, mappedToolbar);
                        await this.saveAndUpdateActiveRule();
                    },
                    ['note-toolbar-suggestion-small']
                );
                cb
                    .setPlaceholder(t('setting.rules.placeholder-toolbar'))
                    .setValue(existingToolbarSetting ? existingToolbarSetting.name : '')
                    .onChange((name) => {
                        if (name === '') {
                            this.ntb.settingsUtils.setFieldPreview(toolbarSetting, undefined);
                            rule.toolbar = '';
                            this.updateActiveRule(); // no need to save: done in suggester callback
                        }
                    })
                if (existingToolbarSetting?.uuid !== NONE_TOOLBAR_ID) {
                    await this.ntb.settingsUtils.updateItemComponentStatus(
                        this, existingToolbarSetting ? existingToolbarSetting.name : '', SettingType.Toolbar, cb.inputEl.parentElement, undefined, 'beforeend'
                    );
                }
            });
        this.ntb.settingsUtils.setFieldPreview(toolbarSetting, existingToolbarSetting);

        //
        // rule conjunction
        //

        const CONJUNCTION_OPTIONS: Record<string, string> = {
            [RuleConjunction.And]: t('setting.rules.option-conjunction-and'),
            [RuleConjunction.Or]: t('setting.rules.option-conjunction-or'),
        };

        // updates conjunction text on all conditions
        const updateConjunctionText = () => {
            const conditionEls = ruleContainerEl.querySelectorAll<HTMLElement>(
                '.note-toolbar-setting-condition'
            );

            conditionEls.forEach((conditionEl, i) => {
                const conjunctionEl = conditionEl.querySelector<HTMLElement>(
                    '.note-toolbar-setting-mapping-field .setting-item-name'
                );

                if (i === 0) {
                    conjunctionEl?.remove();
                    return;
                }

                if (conjunctionEl) {
                    conjunctionEl.textContent = rule.conjunction === RuleConjunction.And
                        ? t('setting.rules.condition-field-prefix-and')
                        : t('setting.rules.condition-field-prefix-or');
                }
            });
        };

        new Setting(nameConjunctionContainerEl)
            .setClass('note-toolbar-setting-mapping-conjunction')
            .setClass('note-toolbar-setting-item-text-style')
            .addDropdown((cb) => {
                cb.addOptions(CONJUNCTION_OPTIONS)
                    .setValue(rule.conjunction)
                    .onChange(debounce(async (value) => {
                        rule.conjunction = value as RuleConjunction;
                        updateConjunctionText();
                        await this.saveAndUpdateActiveRule();
                    }, 250));
            });

        return nameConjunctionContainerEl;

    }

    addRuleControls(ruleEl: HTMLElement, rule: Rule, ruleContainerEl: HTMLElement) {
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
                                .setTitle(t('setting.rules.menu-duplicate-rule'))
                                .setIcon('copy')
                                .onClick(async () => {
                                    const newRule = await this.ntb.rules.duplicateRule(rule);
                                    const newRuleContainerEl = this.renderRuleForm(newRule);
                                    ruleContainerEl?.after(newRuleContainerEl);
                                })
                        });
                        menu.addSeparator();
                        menu.addItem((item: MenuItem) => {
                            item
                                .setTitle(t('setting.rules.menu-delete-rule'))
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
    }

    addRulePreview(ruleEl: HTMLElement, rule: Rule, ruleContainerEl: HTMLElement): HTMLDivElement {

        const rulePreviewContainerEl = ruleEl.createDiv({ cls: 'note-toolbar-setting-rule-preview-container' });

        const rulePreviewEl = rulePreviewContainerEl.createDiv();
        
        const rulePreviewToolbarEl = rulePreviewEl.createDiv();
        const ruleToolbar = this.ntb.settingsManager.getToolbarById(rule.toolbar);

        // toolbar name and preview
        if (ruleToolbar) {
            this.ntb.settingsUtils.renderToolbarName(ruleToolbar, rulePreviewToolbarEl);
        }
        else {
            rulePreviewToolbarEl.createSpan({ 
                cls: 'note-toolbar-setting-item-preview-empty',
                text: t('setting.rules.label-no-toolbar')
            });
        }

        // TODO: show toolbar preview?
        // const ruleToolbarPreviewFr = this.ntb.settingsUtils.createToolbarPreviewFr(ruleToolbar);
        // rulePreviewToolbarEl.append(ruleToolbarPreviewFr);

        // rule conditions
        const rulePreviewConditionsEl = rulePreviewEl.createDiv({ cls: 'note-toolbar-setting-rule-preview-conditions' });
        const ruleConditions = this.ntb.rules.formatRuleConditions(rule);
        rulePreviewConditionsEl.append(ruleConditions);

        // click handler
        setTooltip(rulePreviewContainerEl, t('setting.rules.tooltip-edit'));
        this.ntb.registerDomEvent(rulePreviewContainerEl, 'click', (event: MouseEvent) => {
            ruleContainerEl.toggleAttribute('data-visible');
        });

        return rulePreviewContainerEl;

    }

    /**
     * Returns the form to edit a condition.
     * @param rule Rule for the condition (to get its conjunction)
     * @param condition ToolbarRuleCondition to return the form for
     * @returns the form element as a div
     */
    renderConditionForm(rule: Rule, condition: RuleCondition): HTMLDivElement {
        
        const conditionEl = createDiv();
        conditionEl.className = "note-toolbar-setting-condition";
        conditionEl.setAttribute('data-row-id', condition.id);

        const isFirst = rule.conditions[0]?.id === condition.id;

        // operands
        const operand = RULE_OPERANDS.find((operand) =>
            operand.field === condition.field &&
            operand.key === condition.key
        );

        new Setting(conditionEl)
            .setName(isFirst ? '' : rule.conjunction === RuleConjunction.And ? t('setting.rules.condition-field-prefix-and') : t('setting.rules.condition-field-prefix-or'))
            .setClass('note-toolbar-setting-mapping-field')
            .setClass('note-toolbar-setting-item-text-style')
            .addSearch((cb) => {
                cb
                    .setValue(operand?.label ?? '')
                    .setPlaceholder(t('setting.rules.condition-field-placeholder'))
                    .onChange((name) => {
                        if (name === '') {
                            condition.field = undefined;
                            condition.key = undefined;
                            condition.operator = undefined;
                            condition.value = '';
                            this.updateActiveRule();
                            // const conditionFormEl = this.renderConditionForm(rule, condition);
                            // conditionEl.replaceWith(conditionFormEl);
                        }
                    })

                new RuleOperandSuggester(this.ntb, cb.inputEl, (selectedOperand) => {
                    condition.field = selectedOperand.field;
                    condition.key = selectedOperand.key;
                    condition.operator = selectedOperand.operators[0].op;
                    condition.value = undefined;

                    const conditionFormEl = this.renderConditionForm(rule, condition);
                    conditionEl.replaceWith(conditionFormEl);
                    // move focus to the next field
                    const nextInput = conditionFormEl.querySelector<HTMLSelectElement>(
                        '.note-toolbar-setting-mapping-operator select'
                    );
                    nextInput?.focus();
                }, ['note-toolbar-suggestion-small']);
            });

        //
        // operator
        //

        const operatorValueContainerEl = conditionEl.createDiv();
        operatorValueContainerEl.addClass('note-toolbar-setting-mapping-operator-value');

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

                            await this.saveAndUpdateActiveRule().then(() => {
                                const conditionFormEl = this.renderConditionForm(rule, condition);
                                conditionEl.replaceWith(conditionFormEl);
                                // move focus to the next field
                                const nextInput = conditionFormEl
                                    .querySelector<HTMLElement>('.note-toolbar-setting-mapping-value')
                                    ?.querySelector<HTMLElement>(
                                        'input, button, select, textarea'
                                    );
                                nextInput?.focus();
                            });

                        }, 250));
                });
        }

        //
        // value
        //

        const operatorDefinition = operand?.operators.find(
            (definition) => definition.op === condition.operator
        );

        if (operatorDefinition) {
            switch (operatorDefinition.editor) {
                case 'editormode':
                    if (!condition.value) {
                        condition.value ??= ViewType.Preview;
                        void this.saveAndUpdateActiveRule();
                    }
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
                            new FileSuggester(this.ntb, cb.inputEl, {
                                    showFilesOnly: true,
                                    showFileNamesOnly: true,
                                },
                                ['note-toolbar-suggestion-small']);
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
                    if (!condition.value) {
                        condition.value ??= FileType.Bases;
                        void this.saveAndUpdateActiveRule();
                    }
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
                                        this.renderConditionForm(rule, condition)
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
                            new FolderSuggester(this.ntb, cb.inputEl, ['note-toolbar-suggestion-small']);
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
                            new TagSuggester(this.ntb, cb.inputEl, ['note-toolbar-suggestion-small']);
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
                            // remove condition from the DOM
                            const conditionEl = this.contentEl.querySelector(`.note-toolbar-setting-condition[data-row-id="${rowId}"]`);
                            if (conditionEl) conditionEl.remove();
                        }
                    });
                cb.buttonEl.setAttribute('data-row-id', condition.id);
            });

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
    private updateActiveRule(scrollToFocus = false) {

        const ACTIVE_RULE_CLASS = 'note-toolbar-setting-rule-active';

        // remove existing active toolbar highlight and field errors
        this.contentEl
            .querySelectorAll(`.${ACTIVE_RULE_CLASS}`)
            .forEach(el => el.removeClass(ACTIVE_RULE_CLASS));
        removeFieldErrors(this.contentEl);

        const [, matchType] = this.ntb.rules.getActiveToolbar();
        // this.ntb.debug('getActiveRule: toolbar', mappedToolbar, '⭐️ matches:', matchType);

        let inputCssSelector;
        let ruleEl;
        switch (matchType) {
            case 'default':
                inputCssSelector = `[data-ntb-field-default]`;
                break;
            case 'prop':
                inputCssSelector = `[data-ntb-field-prop]`;
                break;
            default:
                if (typeof matchType === 'object' && matchType !== null) {
                    inputCssSelector = `[data-row-id="${matchType.id}"] .setting-item-control`;
                    // set active state on the rule container (to also highlight previews)
                    ruleEl = this.contentEl.querySelector<HTMLElement>(`.note-toolbar-setting-rules-list-item-container[data-row-id="${matchType.id}"]`);
                    ruleEl?.toggleClass(ACTIVE_RULE_CLASS, true);
                }
                break;
        }

        // set active state on the toolbar input/selector
        let toolbarInputEl;
        if (inputCssSelector) {
            toolbarInputEl = this.contentEl.querySelector(inputCssSelector) as HTMLElement;
            if (!toolbarInputEl) return;

            // display an error if the corresponding file type setting is disabled
            const itemView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
            const isViewTypeSupported = itemView ? this.ntb.utils.hasToolbarForItemView(itemView) : true;
            if (itemView && !isViewTypeSupported) {
                const errorText = t('setting.rules.error-file-type-disabled_field', { filetype: itemView.getViewType() });
                new Notice(errorText, 10000).containerEl.addClass('mod-warning');
                this.ntb.settingsUtils.setFieldError(null, toolbarInputEl, "beforeend", errorText);
            }

            toolbarInputEl.toggleClass(ACTIVE_RULE_CLASS, true);
        }

        if (scrollToFocus) {
            if (ruleEl) ruleEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                else if (toolbarInputEl) toolbarInputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
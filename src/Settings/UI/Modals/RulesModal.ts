import { RuleField, RuleConjunction, RuleOperator, t, Rule, RuleCondition, RULE_OPERANDS, SettingType } from "Settings/NoteToolbarSettings";
import { arraymove, getUUID, moveElement } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { ButtonComponent, debounce, Modal, Setting } from "obsidian";
import ToolbarSuggester from "../Suggesters/ToolbarSuggester";
import { iconTextFr, learnMoreFr } from "../Utils/SettingsUIUtils";
import Sortable from "sortablejs";

export default class RulesModal extends Modal {

    constructor(
        private ntb: NoteToolbarPlugin
    ) {
        super(ntb.app);
    }

    public onOpen() {
        this.setTitle(t('setting.rules.name'));
		this.modalEl.addClass('note-toolbar-setting-modal-container');
        this.display();
    }
    
    /**
     * Displays rules for displaying toolbars.
     */
    public display() {

        this.contentEl.empty();

        new Setting(this.contentEl)
            .setDesc(learnMoreFr(t('setting.rules.description-modal'), 'Defining-where-to-show-toolbars'));

        const rulesContainerEl = this.contentEl.createDiv();
        rulesContainerEl.addClasses(['note-toolbar-setting-rules-container', 'note-toolbar-setting-top-border', 'note-toolbar-setting-ui']);

        const ruleListEl = rulesContainerEl.createDiv();
        ruleListEl.addClass('note-toolbar-sortablejs-list');

        if (this.ntb.settings.rules.length == 0) {
            // empty state
            rulesContainerEl.createDiv({ text: this.ntb.settingsUtils.emptyMessageFr(t('setting.rules.label-empty')) })
                .className = "note-toolbar-setting-empty-message";
        }
        else {

            // add all the rules
            this.ntb.settings.rules.forEach((rule: Rule, ) => {
                const ruleEl = this.renderRuleForm(rule);
                ruleListEl.append(ruleEl);
            });

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
                        void this.ntb.settingsManager.save();
                    }
                }
            });

        }

        //
        // add rule button
        //

        new Setting(rulesContainerEl)
            .setClass("note-toolbar-setting-button")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.rules.button-new'))
                    .setTooltip(t('setting.rules.button-new-tooltip'))
                    .setCta()
                    .onClick(async () => {
                        const newRule: Rule = {
                            id: getUUID(),
                            conjunction: RuleConjunction.And,
                            conditions: [],
                            toolbar: ''
                        };
                        this.ntb.settings.rules.push(newRule);
                        const ruleFormEl = this.renderRuleForm(newRule);
                        ruleListEl.appendChild(ruleFormEl);
                        await this.ntb.settingsManager.save();
                        // TODO: set the focus in the form
                        this.display();
                        //this.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
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
        const conditionContainerEl = ruleContainerEl.createDiv({ cls: 'note-toolbar-setting-condition-container' });

        //
        // delete button
        //

        new Setting(ruleEl)
            .setClass("note-toolbar-setting-item-delete")
            .addButton((cb) => {
                cb.setIcon("minus-circle")
                    .setTooltip(t('setting.rules.button-delete-rule-tooltip'))
                    .onClick(async () => {
                        const rowId = cb.buttonEl.getAttribute('data-row-id');
                        if (rowId) await this.listMoveHandlerById(null, rowId, 'delete');
                    });
                cb.buttonEl.setAttribute('data-row-id', rule.id);
            });

        //
        // toolbar name field
        //

        const existingToolbarSetting = this.ntb.settingsManager.getToolbarById(rule.toolbar);
        const toolbarSetting = new Setting(ruleEl)
            .setClass('note-toolbar-setting-mapping-field')
            .setClass('note-toolbar-setting-item-control-std-with-help')
            .addSearch(async (cb) => {
                new ToolbarSuggester(this.ntb, cb.inputEl);
                cb.setPlaceholder(t('setting.mappings.placeholder-toolbar'))
                    .setValue(existingToolbarSetting ? existingToolbarSetting.name : '')
                    .onChange(debounce(async (name) => {
                        const isValid = await this.ntb.settingsUtils.updateItemComponentStatus(this, name, SettingType.Toolbar, toolbarSetting.controlEl, undefined, 'beforeend');
                        const mappedToolbar = isValid ? this.ntb.settingsManager.getToolbarByName(name) : undefined;
                        rule.toolbar = mappedToolbar?.uuid ?? '';
                        this.ntb.settingsUtils.setFieldPreview(toolbarSetting, mappedToolbar);
                        await this.ntb.settingsManager.save();
                    }, 250));
                await this.ntb.settingsUtils.updateItemComponentStatus(
                    this, existingToolbarSetting ? existingToolbarSetting.name : '', SettingType.Toolbar, cb.inputEl.parentElement, undefined, 'beforeend'
                );
            });
        this.ntb.settingsUtils.setFieldPreview(toolbarSetting, existingToolbarSetting);

        //
        // rule conjunction
        //

        const conjunctionOptions: Record<string, string> = {
            [RuleConjunction.And]: "All of the following are true",
            [RuleConjunction.Or]: "Any of the following are true",
        };

        new Setting(ruleEl)
            .addDropdown((cb) => {
                cb.addOptions(conjunctionOptions)
                    .setValue(rule.conjunction)
                    .onChange(debounce(async (value) => {
                        rule.conjunction = value as RuleConjunction;
                        await this.ntb.settingsManager.save();
                    }, 250));
            });

        //
        // rule drag handle
        //

        const sortableHandleEl = ruleEl.createDiv();
        sortableHandleEl.addClass("note-toolbar-setting-item-controls");
        new Setting(sortableHandleEl)
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
                        // this.plugin.debug("rowId", rowId);
                        if (rowId) await this.listMoveHandlerById(e, rowId);
                    });
            });

        //
        // show existing conditions
        //

        for (const condition of rule.conditions) {
            const conditionEl = this.renderConditionForm(condition);
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
                            field: RuleField.Folder,
                            operator: RuleOperator.Contains,
                            value: 'TODO: condition value goes here'
                        };
                        rule.conditions.push(newCondition);
                        await this.ntb.settingsManager.save();
                        // TODO: add a form item to the existing list
                        const ruleConditionEl = this.renderConditionForm(newCondition);
                        conditionContainerEl.appendChild(ruleConditionEl);
                        // TODO: set the focus in the form
                        // this.parent.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
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
    renderConditionForm(condition: RuleCondition): HTMLDivElement {
        
        const conditionEl = createDiv();
        conditionEl.className = "note-toolbar-setting-condition";

        // operands

        const ruleOperandOptions = Object.fromEntries(
            RULE_OPERANDS.map((operand) => [
                operand.id,
                operand.label
            ])
        );

        new Setting(conditionEl)
            .setClass('note-toolbar-setting-mapping-field')
            .addDropdown((cb) => {
                cb
                    .addOptions({
                        '': 'Select a field',
                        ...ruleOperandOptions
                    })
                    .setValue(
                        RULE_OPERANDS.find((operand) =>
                            operand.field === condition.field &&
                            operand.key === condition.key
                        )?.id ?? ''
                    )
                    .onChange(debounce(async (id) => {
                        const operand = RULE_OPERANDS.find(
                            (operand) => operand.id === id
                        );
                        if (!operand) return;

                        condition.field = operand.field;
                        condition.key = operand.key;
                        condition.operator = RuleOperator.Is;
                        condition.value = 'TODO value goes here';

                        await this.ntb.settingsManager.save();

                        // TODO: re-render operator/value controls
                    }, 250));
            });

        // delete condition button

        new Setting(conditionEl)
            .setClass("note-toolbar-setting-item-delete")
            .addButton((cb) => {
                cb.setIcon("trash")
                    .setTooltip(t('setting.rules.button-delete-condition-tooltip'))
                    .onClick(async () => {
                        const rowId = cb.buttonEl.getAttribute('data-row-id');
                        if (rowId) {
                            this.removeConditionById(rowId);
                            await this.ntb.settingsManager.save();
                            this.display();
                        }
                    });
                cb.buttonEl.setAttribute('data-row-id', condition.id);
            });

        return conditionEl;

    }

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

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
        await this.ntb.settingsManager.save();
        this.display();
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

}
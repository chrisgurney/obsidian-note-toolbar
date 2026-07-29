import { RuleField, RuleConjunction, RuleOperator, t, Rule, RuleCondition, RULE_OPERANDS } from "Settings/NoteToolbarSettings";
import { getUUID } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { ButtonComponent, debounce, Setting } from "obsidian";
import NoteToolbarSettingTab from "../NoteToolbarSettingTab";
import ToolbarSuggester from "../Suggesters/ToolbarSuggester";
import { iconTextFr } from "../Utils/SettingsUIUtils";

export default class RuleUi {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private parent: NoteToolbarSettingTab
    ) {}

    /**
     * Displays rules for displaying toolbars.
     * @param containerEl HTMLElement to add the settings to.
     */
    displayRules(containerEl: HTMLElement): void {
        
        const rulesContainerEl = containerEl.createDiv();
        rulesContainerEl.addClasses(['note-toolbar-setting-rules-container', 'note-toolbar-setting-top-border']);

        new Setting(rulesContainerEl)
            .setName(t('setting.rules.name'))
            .setDesc(t('setting.rules.description'));

        if (this.ntb.settings.rules.length == 0) {
            rulesContainerEl.createDiv({ text: this.ntb.settingsUtils.emptyMessageFr(t('setting.rules.label-empty')) })
                .className = "note-toolbar-setting-empty-message";
        }
        else {
            const ruleListEl = rulesContainerEl.createDiv();
            ruleListEl.addClass('note-toolbar-sortablejs-list');

            this.ntb.settings.rules.forEach((rule: Rule, ) => {
                const ruleEl = this.renderRuleForm(rule);
                ruleListEl.append(ruleEl);
            });

            // const sortable = Sortable.create(ruleListEl, {
            //     chosenClass: 'sortable-chosen',
            //     ghostClass: 'sortable-ghost',
            //     handle: '.sortable-handle',
            //     onChange: (item) => navigator.vibrate(50),
            //     onChoose: (item) => navigator.vibrate(50),
            //     onSort: async (item) => {
            //         this.plugin.debug("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
            //         if (item.oldIndex !== undefined && item.newIndex !== undefined) {
            //             moveElement(this.plugin.settings.folderMappings, item.oldIndex, item.newIndex);
            //             await this.plugin.settingsManager.save();
            //         }
            //     }
            // });

        }

        // TODO: loop over rules and renderRuleForm

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
                        await this.ntb.settingsManager.save();
                        // TODO: add a form item to the existing list
                        const ruleFormEl = this.renderRuleForm(newRule);
                        rulesContainerEl.appendChild(ruleFormEl);
                            // TODO: put the existing code in a function
                        // TODO: set the focus in the form
                        // this.parent.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
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
        ruleContainerEl.className = "note-toolbar-setting-folder-list-item-container";
        // toolbarFolderListItemDiv.setAttribute('data-row-id', rule.id);

        const ruleEl = ruleContainerEl.createDiv();

        //
        // delete button
        //

        new Setting(ruleEl)
            .setClass("note-toolbar-setting-item-delete")
            .addButton((cb) => {
                cb.setIcon("minus-circle")
                    .setTooltip(t('setting.button-delete-tooltip'))
                    .onClick(async () => {
                        const rowId = cb.buttonEl.getAttribute('data-row-id');
                        if (rowId) await this.parent.listMoveHandlerById(null, rowId, 'delete');
                    });
                // cb.buttonEl.setAttribute('data-row-id', rule.id);
            });

        //
        // toolbar name field
        //

        new Setting(ruleEl)
            .setClass("note-toolbar-setting-mapping-field")
            .addSearch((cb) => {
                new ToolbarSuggester(this.ntb, cb.inputEl);
                cb.setPlaceholder(t('setting.mappings.placeholder-toolbar'))
                    .setValue(this.ntb.settingsManager.getToolbarName(rule.toolbar))
                    .onChange(debounce(async (name) => {
                        const mappedToolbar = this.ntb.settingsManager.getToolbarByName(name);
                        if (mappedToolbar) {
                            rule.toolbar = mappedToolbar.uuid;
                            await this.ntb.settingsManager.save();
                        }
                        // TODO: if toolbar is not valid show error/warning
                    }, 250));
            });

        //
        // show existing conditions
        //

        // TODO: loop over conditions and use renderConditionForm

        //
        // add condition button
        //

        new Setting(ruleEl)
            .setClass("note-toolbar-setting-button")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.rules.button-newcondition'))
                    .setTooltip(t('setting.rules.button-newcondition-tooltip'))
                    .setCta()
                    .onClick(async () => {
                        const newCondition: RuleCondition = {
                            field: RuleField.Folder,
                            operator: RuleOperator.Contains,
                            value: 'TODO: condition value goes here'
                        };
                        rule.conditions.push(newCondition);
                        await this.ntb.settingsManager.save();
                        // TODO: add a form item to the existing list
                        const ruleConditionEl = this.renderConditionForm(newCondition);
                        ruleContainerEl.appendChild(ruleConditionEl);
                        // TODO: set the focus in the form
                        // this.parent.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
                    });
                button.buttonEl.setText(iconTextFr('plus', t('setting.rules.button-newcondition')));
            });

        //
        // rule drag handle
        //

        // const sortableHandleEl = createDiv();
        // sortableHandleEl.addClass("note-toolbar-setting-item-controls");
        // new Setting(sortableHandleEl)
        //     .addExtraButton((cb) => {
        //         cb.setIcon('grip-horizontal')
        //             .setTooltip(t('setting.button-drag-tooltip'))
        //             .extraSettingsEl.addClass('sortable-handle');
        //         cb.extraSettingsEl.setAttribute('data-row-id', rule.id);
        //         cb.extraSettingsEl.tabIndex = 0;
        //         this.ntb.registerDomEvent(
        //             cb.extraSettingsEl,	'keydown', async (e) => {
        //                 const currentEl = e.target as HTMLElement;
        //                 const rowId = currentEl.getAttribute('data-row-id');
        //                 // this.plugin.debug("rowId", rowId);
        //                 if (rowId) await this.parent.listMoveHandlerById(e, rowId);
        //             });
        //     });
        // conditionEl.append(sortableHandleEl);

        return ruleContainerEl;

    }

    /**
     * Returns the form to edit a condition.
     * @param condition ToolbarRuleCondition to return the form for
     * @returns the form element as a div
     */
    renderConditionForm(condition: RuleCondition): HTMLDivElement {
        
        const conditionEl = createDiv();
        conditionEl.className = "note-toolbar-setting-item-fields";

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

                        if (!operand) {
                            return;
                        }

                        condition.field = operand.field;
                        condition.key = operand.key;
                        condition.operator = RuleOperator.Is;
                        condition.value = 'TODO value goes here';

                        await this.ntb.settingsManager.save();

                        // TODO: re-render operator/value controls
                    }, 250));
            });

        return conditionEl;

    }

}
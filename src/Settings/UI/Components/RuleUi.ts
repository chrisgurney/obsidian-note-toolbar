import { RuleConditionType, RuleConjunctionType, RuleOperatorType, t, ToolbarRule, ToolbarRuleCondition } from "Settings/NoteToolbarSettings";
import { getUUID } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { ButtonComponent, debounce, Setting } from "obsidian";
import NoteToolbarSettingTab from "../NoteToolbarSettingTab";
import ToolbarSuggester from "../Suggesters/ToolbarSuggester";
import { emptyMessageFr, handleKeyClick, iconTextFr } from "../Utils/SettingsUIUtils";

export default class RuleUi {

    private rulesListOpen: boolean = true;

    constructor(
        private ntb: NoteToolbarPlugin, 
        private parent: NoteToolbarSettingTab
    ) {}

    /**
     * Displays rules for displaying toolbars.
     * @param containerEl HTMLElement to add the settings to.
     */
    displayRules(containerEl: HTMLElement): void {

        const rulesContainer = createDiv();
        rulesContainer.addClasses(['note-toolbar-setting-rules-container', 'note-toolbar-setting-top-border']);
        this.rulesListOpen ? rulesContainer.show() : rulesContainer.hide();

        const toolbarRulesSetting = new Setting(rulesContainer)
            .setName(t('setting.rules.name'))
            .setDesc(t('setting.rules.description'));

        if (this.ntb.settings.rules.length > 4) {
            toolbarRulesSetting
                .addExtraButton((cb) => {
                    cb.setIcon('right-triangle')
                    .setTooltip(t('setting.button-collapse-tooltip'))
                    .onClick(async () => {
                        const rulesContainerEl = containerEl.querySelector('.note-toolbar-setting-rules-container') as HTMLDivElement;
                        if (rulesContainerEl) {
                            this.rulesListOpen = !this.rulesListOpen;
                            this.rulesListOpen ? rulesContainerEl.show() : rulesContainerEl.hide();
                            let heading = rulesContainerEl.querySelector('.setting-item-info .setting-item-name');
                            this.rulesListOpen ? heading?.setText(t('setting.rules.name')) : heading?.setText(t('setting.rules.name-with-count', { count: this.ntb.settings.folderMappings.length }));
                            cb.setTooltip(this.rulesListOpen ? t('setting.button-collapse-tooltip') : t('setting.button-expand-tooltip'));
                        }
                    });
                    cb.extraSettingsEl.addClass('note-toolbar-setting-item-expand');
                    handleKeyClick(this.ntb, cb.extraSettingsEl);
                });
        }
        else {
            toolbarRulesSetting.controlEl.hide();
        }

        const collapsibleContainer = createDiv();
        collapsibleContainer.addClass('note-toolbar-setting-items-list-container');

        if (this.ntb.settings.rules.length == 0) {
            rulesContainer
                .createEl("div", { text: emptyMessageFr(this.ntb, t('setting.rules.label-empty')) })
                .className = "note-toolbar-setting-empty-message";
        }
        else {
            let toolbarRuleListEl = createDiv();
            toolbarRuleListEl.addClass('note-toolbar-sortablejs-list');

            this.ntb.settings.rules.forEach((rule: ToolbarRule, index) => {
                let toolbarFolderListItemDiv = this.renderRuleForm(rule);
                toolbarRuleListEl.append(toolbarFolderListItemDiv);
            });

            // const sortable = Sortable.create(toolbarRuleListEl, {
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

            collapsibleContainer.appendChild(toolbarRuleListEl)

        }

        // TODO: loop over rules and renderRuleForm

        //
        // add rule button
        //

        new Setting(collapsibleContainer)
            .setClass("note-toolbar-setting-button")
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText(t('setting.rules.button-new'))
                    .setTooltip(t('setting.rules.button-new-tooltip'))
                    .setCta()
                    .onClick(async () => {
                        const newRule: ToolbarRule = {
                            conjunction: RuleConjunctionType.And,
                            conditions: [],
                            toolbar: ''
                        };
                        this.ntb.settings.rules.push(newRule);
                        await this.ntb.settingsManager.save();
                        // TODO: add a form item to the existing list
                        // renderRuleForm(newRule);
                            // TODO: put the existing code in a function
                        // TODO: set the focus in the form
                        // this.parent.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
                    });
                button.buttonEl.setText(iconTextFr('plus', t('setting.rules.button-new')));
            });

        rulesContainer.appendChild(collapsibleContainer);
        containerEl.append(rulesContainer);

    }

    /**
     * Returns the form to edit a rule.
     * @param rule ToolbarRule to return the form for
     * @returns the form element as a div
     */
    renderRuleForm(rule: ToolbarRule): HTMLDivElement {

        const ruleEl = createDiv();
        ruleEl.className = "note-toolbar-setting-folder-list-item-container";
        // toolbarFolderListItemDiv.setAttribute('data-row-id', rule.id);

        //
        // delete button
        //

        new Setting(ruleEl)
            .setClass("note-toolbar-setting-item-delete")
            .addButton((cb) => {
                cb.setIcon("minus-circle")
                    .setTooltip(t('setting.button-delete-tooltip'))
                    .onClick(async () => {
                        let rowId = cb.buttonEl.getAttribute('data-row-id');
                        rowId ? this.parent.listMoveHandlerById(null, rowId, 'delete') : undefined;
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
                        let mappedToolbar = this.ntb.settingsManager.getToolbarByName(name);
                        if (mappedToolbar) {
                            rule.toolbar = mappedToolbar.uuid;
                            await this.ntb.settingsManager.save();
                        }
                        // TODO: if toolbar is not valid show error/warning
                    }, 250));
            });

        //
        // condition fields
        //

        // TODO: loop over conditions and renderConditionForm
        // ruleEl.append(conditionsEl);

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
                        const newCondition: ToolbarRuleCondition = {
                            id: getUUID(),
                            key: '',
                            type: RuleConditionType.Folder,
                            value: '',
                            operator: RuleOperatorType.Is
                        };
                        rule.conditions.push(newCondition);
                        await this.ntb.settingsManager.save();
                        // TODO: add a form item to the existing list
                        // renderRuleForm(newRule);
                            // TODO: put the existing code in a function
                        // TODO: set the focus in the form
                        // this.parent.display('.note-toolbar-sortablejs-list > div:last-child input[type="search"]', true);
                    });
                button.buttonEl.setText(iconTextFr('plus', t('setting.rules.button-new')));
            });

        return ruleEl;

    }

    /**
     * Returns the form to edit a condition.
     * @param condition ToolbarRuleCondition to return the form for
     * @returns the form element as a div
     */
    renderConditionForm(condition: ToolbarRuleCondition): HTMLDivElement {
        
        const conditionEl = createDiv();
        conditionEl.className = "note-toolbar-setting-item-fields";

        const ruleTypeOptions: Record<string, string> = {
            '': "Select a type",
            ...Object.entries(RuleConditionType).reduce((acc, [k, v]) => {
                acc[v] = k;
                return acc;
            }, {} as Record<string, string>)
        };
        new Setting(conditionEl)
            .setClass("note-toolbar-setting-mapping-field")
            .addDropdown((cb) => {
                cb
                    .addOptions(ruleTypeOptions)
                    .setValue(condition.type)
                    .onChange(debounce(async (newRule) => {
                        if (
                            newRule
                            // && this.plugin.settings.rules.some(
                            //     (map, mapIndex) => {
                            //         return mapping != map ? map.folder.toLowerCase() === newRule.toLowerCase() : undefined;
                            //     }
                            // )
                        ) {
                            if (document.getElementById("note-toolbar-name-error") === null) {
                                let errorDiv = createEl("div", { 
                                    text: t('setting.mappings.error-folder-already-mapped'), 
                                    attr: { id: "note-toolbar-name-error" }, cls: "note-toolbar-setting-error-message" });
                                conditionEl.insertAdjacentElement('afterend', errorDiv);
                                conditionEl.children[0].addClass("note-toolbar-setting-error");
                            }
                        }
                        else {
                            document.getElementById("note-toolbar-name-error")?.remove();
                            conditionEl.children[0].removeClass("note-toolbar-setting-error");
                            // rule.folder = newRule ? normalizePath(newRule) : "";
                            await this.ntb.settingsManager.save();
                        }
                    }, 250));
            });

        //
        // drag handle
        //

        const sortableHandleEl = createDiv();
        sortableHandleEl.addClass("note-toolbar-setting-item-controls");
        new Setting(sortableHandleEl)
            .addExtraButton((cb) => {
                cb.setIcon('grip-horizontal')
                    .setTooltip(t('setting.button-drag-tooltip'))
                    .extraSettingsEl.addClass('sortable-handle');
                cb.extraSettingsEl.setAttribute('data-row-id', condition.id);
                cb.extraSettingsEl.tabIndex = 0;
                this.ntb.registerDomEvent(
                    cb.extraSettingsEl,	'keydown', (e) => {
                        let currentEl = e.target as HTMLElement;
                        let rowId = currentEl.getAttribute('data-row-id');
                        // this.plugin.debug("rowId", rowId);
                        rowId ? this.parent.listMoveHandlerById(e, rowId) : undefined;
                    });
            });
        conditionEl.append(sortableHandleEl);

        return conditionEl;

    }

}
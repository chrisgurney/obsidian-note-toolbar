import NoteToolbarPlugin from "main";
import { ButtonComponent, Modal, Setting, ToggleComponent } from "obsidian";
import { t } from "Settings/NoteToolbarSettings";
import { fixToggleTab, learnMoreFr } from "../Utils/SettingsUIUtils";


export default class CalloutSettingsModal extends Modal {

    constructor(
        private ntb: NoteToolbarPlugin,
        private callback?: () => Promise<void>
    ) {
        super(ntb.app);
    }

    public onOpen() {
        this.display();
    }
    
    /**
     * Displays settings for copy callouts.
     */
    public display() {

        this.setTitle(t('setting.copy-as-callout.title'))

        new Setting(this.contentEl)
            .setDesc(learnMoreFr(t('setting.copy-as-callout.description'), 'Creating-callouts-from-toolbars'))

        new Setting(this.contentEl)
            .setName(t('setting.copy-as-callout.option-icons'))
            .setDesc(t('setting.copy-as-callout.option-icons-description'))
            .addToggle((toggle: ToggleComponent) => {
                toggle
                    .setValue(this.ntb.settings.export.includeIcons)
                    .onChange(async (value) => {
                        this.ntb.settings.export.includeIcons = value;
                        await this.ntb.settingsManager.save();
                        if (this.callback) await this.callback();
                    });
                fixToggleTab(toggle);
            });

        new Setting(this.contentEl)
            .setName(t('setting.copy-as-callout.option-vars'))
            .setDesc(t('setting.copy-as-callout.option-vars-description', {interpolation: { skipOnVariables: true }} ))
            .addToggle((toggle: ToggleComponent) => {
                toggle
                    .setValue(this.ntb.settings.export.replaceVars)
                    .onChange(async (value) => {
                        this.ntb.settings.export.replaceVars = value;
                        await this.ntb.settingsManager.save();
                        if (this.callback) await this.callback();
                    });
                fixToggleTab(toggle);
            });

        new Setting(this.contentEl)
            .setName(t('setting.copy-as-callout.option-ids'))
            .setDesc(t('setting.copy-as-callout.option-ids-description'))
            .addToggle((toggle: ToggleComponent) => {
                toggle
                    .setValue(this.ntb.settings.export.useIds)
                    .onChange(async (value) => {
                        this.ntb.settings.export.useIds = value;
                        await this.ntb.settingsManager.save();
                        if (this.callback) await this.callback();
                    });
                fixToggleTab(toggle);
            });

        new Setting(this.contentEl)
            .setName(t('setting.copy-as-callout.option-data'))
            .setDesc(t('setting.copy-as-callout.option-data-description'))
            .addToggle((toggle: ToggleComponent) => {
                toggle
                    .setValue(this.ntb.settings.export.useDataEls)
                    .onChange(async (value) => {
                        this.ntb.settings.export.useDataEls = value;
                        await this.ntb.settingsManager.save();
                        if (this.callback) await this.callback();
                    });
                fixToggleTab(toggle);
            });

        new Setting(this.contentEl)
            .setClass('note-toolbar-setting-no-border')
            .addButton((btn: ButtonComponent) => {
                btn.setButtonText(t('setting.copy-as-callout.button-close'))
                    .setCta()
                    .setTooltip(t('setting.copy-as-callout.button-close-description'))
                    .onClick(async () => {
                        await this.ntb.settingsManager.save();
                        this.close();
                        if (this.callback) await this.callback();
                    });
            });

    }

}
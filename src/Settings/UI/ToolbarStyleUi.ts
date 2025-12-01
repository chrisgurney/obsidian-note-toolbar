import { DEFAULT_STYLE_DISCLAIMERS, DEFAULT_STYLE_OPTIONS, MOBILE_STYLE_DISCLAIMERS, MOBILE_STYLE_OPTIONS, PositionType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { arraymove } from "Utils/Utils";
import NoteToolbarPlugin from "main";
import { debounce, ItemView, MarkdownView, Setting } from "obsidian";
import StyleModal from "./Modals/StyleModal";
import ToolbarSettingsModal from "./Modals/ToolbarSettingsModal";
import { emptyMessageFr, getDisclaimersFr, getValueForKey, learnMoreFr } from "./Utils/SettingsUIUtils";

export default class ToolbarStyleUi {

    constructor(
        private ntb: NoteToolbarPlugin, 
        private parent: ToolbarSettingsModal | StyleModal, 
        private toolbar: ToolbarSettings
    ) {}

    /**
     * Displays the Style settings.
     * @param settingsDiv HTMLElement to add the settings to.
     */
    public displayStyleSetting(settingsDiv: HTMLElement) {

        let heading = new Setting(settingsDiv)
            .setDesc(learnMoreFr(t('setting.styles.description'), 'Styling-toolbars'));
        
        if (this.parent instanceof ToolbarSettingsModal) {
            heading.setName(t('setting.styles.name')).setHeading();
        }

        //
        // Default
        //

        let defaultStyleDiv = createDiv();
        defaultStyleDiv.className = "note-toolbar-setting-item-style";

        if (this.toolbar.defaultStyles.length == 0) {
            let emptyMsg = this.parent.containerEl.createEl("div", 
                { text: emptyMessageFr(t('setting.styles.option-default-empty')) });
            emptyMsg.className = "note-toolbar-setting-empty-message";
            defaultStyleDiv.append(emptyMsg);
        }
        else {

            this.toolbar.defaultStyles.forEach(
                (style, index) => {
                    let styleDisclaimer = getValueForKey(DEFAULT_STYLE_DISCLAIMERS, style);
                    new Setting(defaultStyleDiv)
                        .setName(getValueForKey(DEFAULT_STYLE_OPTIONS, style))
                        .setTooltip((styleDisclaimer ? styleDisclaimer + ' ' : '') + t('setting.styles.style-tooltip-use-class', { class: style }))
                        .addExtraButton((cb) => {
                            cb.setIcon("cross")
                                .setTooltip(t('setting.styles.style-remove-tooltip'))
                                .onClick(async () => this.listMoveHandler(null, this.toolbar.defaultStyles, index, "delete"));
                            cb.extraSettingsEl.setAttribute("tabindex", "0");
                            this.ntb.registerDomEvent(
                                cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.defaultStyles, index, "delete"));
                        });
            });

        }

        const excludeFromDefault: string[] = this.getExcludedDefaultStyles();
        const defaultStyleOptions = [{ placeholder: t('setting.styles.option-placeholder') }, ...DEFAULT_STYLE_OPTIONS]
            .filter((option) => {
                const key = Object.keys(option)[0];
                return !this.toolbar.defaultStyles.includes(key) && !excludeFromDefault.includes(key);
            })
            .sort((a, b) => {
                const nameA = Object.values(a)[0];
                const nameB = Object.values(b)[0];
                return nameA.localeCompare(nameB);
            })
            .reduce((acc, option) => ({ ...acc, ...option }), {});

        let defaultStyleDropdown = new Setting(defaultStyleDiv)
            .addDropdown((dropdown) =>
                dropdown
                    .addOptions(defaultStyleOptions)
                    .setValue('placeholder')
                    .onChange(async (val) => {
                        if (this.toolbar.defaultStyles.includes(val)) {
                            this.toolbar.defaultStyles =
                                this.toolbar.defaultStyles.filter((i) => i !== val);
                        } 
                        else {
                            this.toolbar.defaultStyles.push(val);
                        }
                        this.toolbar.updated = new Date().toISOString();
                        await this.ntb.settingsManager.save();
                        this.parent.display();
                    })
        );
        defaultStyleDropdown.controlEl.id = 'default-style-dropdown';

        const defaultDesc = document.createDocumentFragment();
        defaultDesc.append(t('setting.styles.option-default-description'), document.createElement('br'));
        defaultDesc.append(getDisclaimersFr(DEFAULT_STYLE_DISCLAIMERS, this.toolbar.defaultStyles));

        new Setting(settingsDiv)
            .setName(t('setting.styles.option-default-name'))
            .setDesc(defaultDesc)
            .setClass("note-toolbar-setting-item-styles")
            .settingEl.append(defaultStyleDiv);

        //
        // Mobile
        //

        let mobileStyleDiv = createDiv();
        mobileStyleDiv.className = "note-toolbar-setting-item-style";

        if (this.toolbar.mobileStyles.length == 0) {
            let emptyMsg = this.parent.containerEl.createEl("div", 
                { text: emptyMessageFr(t('setting.styles.option-mobile-empty')) });
            emptyMsg.className = "note-toolbar-setting-empty-message";
            mobileStyleDiv.append(emptyMsg);
        }
        else {

            this.toolbar.mobileStyles.forEach(
                (style, index) => {
                    let styleDisclaimer = getValueForKey(MOBILE_STYLE_DISCLAIMERS, style);
                    new Setting(mobileStyleDiv)
                        .setName(getValueForKey(MOBILE_STYLE_OPTIONS, style))
                        .setTooltip((styleDisclaimer ? styleDisclaimer + ' ' : '') + 'Use in Callout or CSS: ' + style)
                        .addExtraButton((cb) => {
                            cb.setIcon("cross")
                                .setTooltip("Remove")
                                .onClick(async () => this.listMoveHandler(null, this.toolbar.mobileStyles, index, "delete"));
                            cb.extraSettingsEl.setAttribute("tabindex", "0");
                            this.ntb.registerDomEvent(
                                cb.extraSettingsEl, 'keydown', (e) => this.listMoveHandler(e, this.toolbar.mobileStyles, index, "delete"));
                        });
            });

        }

        const excludeFromMobile: string[] = this.getExcludedMobileStyles();
        const mobileStyleOptions = [{ placeholder: t('setting.styles.option-placeholder') }, ...MOBILE_STYLE_OPTIONS]
            .filter((option) => {
                const key = Object.keys(option)[0];
                return !this.toolbar.mobileStyles.includes(key) && !excludeFromMobile.includes(key);
            })
            .sort((a, b) => {
                const nameA = Object.values(a)[0];
                const nameB = Object.values(b)[0];
                return nameA.localeCompare(nameB);
            })
            .reduce((acc, option) => ({ ...acc, ...option }), {});

        new Setting(mobileStyleDiv)
            .addDropdown((dropdown) =>
                dropdown
                    .addOptions(mobileStyleOptions)
                    .setValue('placeholder')
                    .onChange(async (val) => {
                        if (this.toolbar.mobileStyles.includes(val)) {
                            this.toolbar.mobileStyles =
                                this.toolbar.mobileStyles.filter((i) => i !== val);
                        } 
                        else {
                            this.toolbar.mobileStyles.push(val);
                        }
                        this.toolbar.updated = new Date().toISOString();
                        await this.ntb.settingsManager.save();
                        this.parent.display();
                    })
        );

        const mobileDesc = document.createDocumentFragment();
        mobileDesc.append(t('setting.styles.option-mobile-description'), document.createElement('br'));
        mobileDesc.append(getDisclaimersFr(MOBILE_STYLE_DISCLAIMERS, this.toolbar.mobileStyles));

        new Setting(settingsDiv)
            .setName(t('setting.styles.option-mobile-name'))
            .setDesc(mobileDesc)
            .setClass("note-toolbar-setting-item-styles")
            .settingEl.append(mobileStyleDiv);

        new Setting(settingsDiv)
            .setName(t('setting.styles.option-custom-name'))
            .setDesc(learnMoreFr(t('setting.styles.option-custom-description'), 'Custom-styling'))
            .setClass('note-toolbar-setting-item-full-width')
            .addText(text => text
                .setPlaceholder(t('setting.styles.option-custom-empty'))
                .setValue(this.toolbar.customClasses)
                .onChange(debounce(async (value) => {
                    this.toolbar.customClasses = value.trim();
                    await this.ntb.settingsManager.save();
                }, 750)));

        new Setting(settingsDiv)
            .setDesc(learnMoreFr(t('setting.styles.help'), 'Style-Settings-plugin-support'));

    }

    /**
     * Figures out list of default styles not to show, based on toolbar position and other styles set.
     * @returns list of styles to exclude
     */
    getExcludedDefaultStyles(): string[] {
        const excludedStyles: string[] = [];

        if (this.toolbar.position.desktop?.allViews?.position !== PositionType.Props) excludedStyles.push('sticky');
        if (this.toolbar.position.desktop?.allViews?.position !== PositionType.Top &&
            this.toolbar.position.desktop?.allViews?.position !== PositionType.Bottom) excludedStyles.push('wide');

        if (this.isUsingLaunchpad()) {
            excludedStyles.push('center', 'left', 'right', 'between', 'even', 'sticky', 'tab');
        }

        const { defaultStyles } = this.toolbar;
        if (defaultStyles.includes('left')) excludedStyles.push('right', 'center');
        if (defaultStyles.includes('right')) excludedStyles.push('left', 'center');
        if (defaultStyles.includes('center')) excludedStyles.push('left', 'right');
        if (defaultStyles.includes('between')) excludedStyles.push('even');
        if (defaultStyles.includes('even')) excludedStyles.push('between');

        return excludedStyles;
    }

    /**
     * Figures out list of mobile styles not to show, based on toolbar position and other styles set.
     * @returns list of styles to exclude
     */
    getExcludedMobileStyles(): string[] {
        const excludedStyles: string[] = [];
        
        if (this.toolbar.position.mobile?.allViews?.position !== PositionType.Top) excludedStyles.push('mnwd', 'mwd');
        if (this.toolbar.position.mobile?.allViews?.position !== PositionType.Props) excludedStyles.push('mstcky', 'mnstcky');

        if (this.isUsingLaunchpad()) {
            excludedStyles.push('mctr', 'mlft', 'mrght', 'mbtwn', 'mevn', 'mstcky', 'mnstcky', 'mntb', 'mnwrp', 'mtb');
        }

        const { mobileStyles } = this.toolbar;
        if (mobileStyles.includes('mlft')) excludedStyles.push('mrght', 'mctr');
        if (mobileStyles.includes('mrght')) excludedStyles.push('mlft', 'mctr');
        if (mobileStyles.includes('mctr')) excludedStyles.push('mlft', 'mrght');
        if (mobileStyles.includes('mbtwn')) excludedStyles.push('mevn');
        if (mobileStyles.includes('mevn')) excludedStyles.push('mbtwn');
        if (mobileStyles.includes('mnwd')) excludedStyles.push('mwd');
        if (mobileStyles.includes('mwd')) excludedStyles.push('mnwd');

        const { defaultStyles } = this.toolbar;
        if (defaultStyles.includes('border')) excludedStyles.push('mbrder');
        if (!defaultStyles.includes('border')) excludedStyles.push('mnbrder');
        if (defaultStyles.includes('button')) excludedStyles.push('mbtn');
        if (defaultStyles.includes('wide')) excludedStyles.push('mwd');

        return excludedStyles;
    }

    /**
     * Checks if the toolbar is being displayed in the Launchpad view.
     * @returns true if the toolbar is being displayed in the Launchpad view, false otherwise.
     */
    isUsingLaunchpad(): boolean {
        const toolbarView = this.ntb.app.workspace.getActiveViewOfType(ItemView);
        return Boolean(
            !(toolbarView instanceof MarkdownView) && toolbarView?.getViewType() === 'empty' 
            && this.ntb.settings.showLaunchpad && this.ntb.settings.emptyViewToolbar
        );
    }

    /**
     * Handles moving items within a list, and deletion, based on click or keyboard event.
     * @param keyEvent KeyboardEvent, if the keyboard is triggering this handler.
     * @param itemArray Array that we're operating on.
     * @param index Number of the item in the list we're moving/deleting.
     * @param action Direction of the move, or "delete".
     */
    async listMoveHandler(
        keyEvent: KeyboardEvent | null, 
        itemArray: ToolbarItemSettings[] | string[],
        index: number, 
        action?: 'up' | 'down' | 'delete'
    ): Promise<void> {
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
                arraymove(itemArray, index, index - 1);
                this.toolbar.updated = new Date().toISOString();
                break;
            case 'down':
                arraymove(itemArray, index, index + 1);
                this.toolbar.updated = new Date().toISOString();
                break;
            case 'delete':
                itemArray.splice(index, 1);
                this.toolbar.updated = new Date().toISOString();
                break;
        }
        await this.ntb.settingsManager.save();
        this.parent.display();
    }

}
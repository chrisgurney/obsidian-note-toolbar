import NoteToolbarPlugin from "main";
import { Modal, Platform, Setting, setTooltip, TextAreaComponent, ToggleComponent } from "obsidian";
import { ItemType, t, ToolbarItemSettings, ToolbarSettings } from "Settings/NoteToolbarSettings";
import { exportToCallout } from "Utils/ImportExport";
import { toolbarHasMenu } from "Utils/Utils";
import { fixToggleTab, learnMoreFr } from "../Utils/SettingsUIUtils";
import CopyTextModal from "./CopyTextModal";

type TabId = 'copy-text' | 'share-uri';

/**
 * Tabbed modal with options to copy toolbar or item as a callout, or share it as a URI.
 */
export default class ShareModal extends Modal {

    private activeTab: TabId = 'copy-text';

    private useObsidianUri = false;

	constructor(
        private ntb: NoteToolbarPlugin, 
        private shareUri: string, 
        private toolbarOrItem: ToolbarSettings | ToolbarItemSettings
    ) {
        super(ntb.app);
        this.modalEl.addClass('note-toolbar-share-dialog');
    }

    public onOpen() {
        const isToolbar = 'items' in this.toolbarOrItem;
        if (isToolbar) {
            this.setTitle(t('export.title-share', { toolbar: (this.toolbarOrItem as ToolbarSettings).name, interpolation: { escapeValue: false } })); 
        }
        else {
            const itemText = (this.toolbarOrItem as ToolbarItemSettings).label || (this.toolbarOrItem as ToolbarItemSettings).tooltip || (this.toolbarOrItem as ToolbarItemSettings).icon;
            this.setTitle(t('export.item-share', { item: itemText, interpolation: { escapeValue: false } }));
        }
        this.display();
    }

    display(): void {

        this.contentEl.empty();
        this.modalEl.addClass('note-toolbar-setting-modal-container');

        const tabsEl = this.contentEl.createDiv({ cls: 'note-toolbar-setting-tabs' });
        tabsEl.setAttribute('role', 'tablist');
        setTooltip(tabsEl, t('export.tooltip-copy-share'));

        this.createTab(
            tabsEl,
            'copy-text',
            t('export.label-callout'),
            CopyTextModal.renderCopyTextContent(
                this.ntb,
                () => exportToCallout( this.ntb, this.toolbarOrItem, this.ntb.settings.export ),
                learnMoreFr( t('export.label-callout-description'), 'Creating-callouts-from-toolbars' ),
                undefined,
                true
            )
        );

        this.createTab(
            tabsEl,
            'share-uri',
            t('export.label-share-uri'),
            this.renderShareContent()
        );

        this.registerTabEvents(tabsEl);

    }

    renderShareContent(): HTMLElement {

        const shareContentEl = createDiv();

        const isToolbar = 'items' in this.toolbarOrItem;

        new Setting(shareContentEl)
            .setName(learnMoreFr(t('export.label-share-description'), 'Sharing-toolbars'))
            .addTextArea((text: TextAreaComponent) => {
                text.setValue(this.shareUri);
                window.requestAnimationFrame((): void => {
                    text.inputEl.focus();
                    text.inputEl.select();
                    text.inputEl.readOnly = true;
                    text.inputEl.scrollTop = 0;
                    this.ntb.registerDomEvent(text.inputEl, 'focus', () => {
                        text.inputEl.select();
                    });
                    if (Platform.isDesktop) {
                        text.inputEl.addEventListener('copy', () => {
                            window.requestAnimationFrame(() => this.close());
                        });
                    }
                    window.setTimeout(() => {
                        text.inputEl.focus();
                        text.inputEl.select();
                    }, 50);
                });
            });

        shareContentEl.createEl('p', { 
            cls: 'note-toolbar-setting-field-help-copy',
            text: Platform.isPhone ? t('copy.instructions_phone') 
                : Platform.isTablet ? t('copy.instructions_tablet') 
                : t('copy.instructions_desktop')
        });

        new Setting(shareContentEl)
            .setName(t('export.option-uri'))
            .setDesc(t('export.option-uri-description'))
            .addToggle((toggle: ToggleComponent) => {
                toggle
                    .setValue(this.useObsidianUri)
                    .onChange(async (value) => {
                        this.useObsidianUri = value;
                        this.shareUri = await this.ntb.protocolManager.getShareUri(this.toolbarOrItem, this.useObsidianUri);
                        this.display();
                    });
                fixToggleTab(toggle);
            });

        //
        // disclaimers, if any
        //

        const isLongUri = this.shareUri.length > 2048;
        const hasMenu = isToolbar 
            ? toolbarHasMenu((this.toolbarOrItem as ToolbarSettings)) 
            : ((this.toolbarOrItem as ToolbarItemSettings).linkAttr.type === ItemType.Menu);

        if (isLongUri || hasMenu) {
            const disclaimers = shareContentEl.createDiv();
            disclaimers.addClass('note-toolbar-setting-field-help');
            const disclaimersList = disclaimers.createEl('ul');
            if (isLongUri) disclaimersList.createEl('li', { text: t('export.warning-share-length') });
            if (hasMenu) disclaimersList.createEl('li', { text: t('export.warning-share-menu') });
        }

        return shareContentEl;

    }

    private createTab( 
        tabsEl: HTMLElement, 
        tabId: TabId, 
        label: string, 
        tabContentEl: HTMLElement 
    ): void {

        const tabEl = tabsEl.createEl('button', { text: label, type: 'button' });

        tabEl.setAttribute('role', 'tab');
        tabEl.setAttribute('aria-selected', String(this.activeTab === tabId));
        tabEl.setAttribute('aria-controls', tabId);
        tabEl.tabIndex = this.activeTab === tabId ? 0 : -1;
        tabEl.id = `ntb-tab-${tabId}`;

        const panelContainerEl = this.contentEl.createDiv();

        const panelEl = panelContainerEl.createDiv();
        panelEl.id = tabId;
        panelEl.setAttribute('role', 'tabpanel');
        panelEl.setAttribute('aria-labelledby', tabEl.id);
        panelEl.hidden = this.activeTab !== tabId;
        panelEl.append(tabContentEl);

        this.ntb.registerDomEvent(tabEl, 'click', () => { this.activeTab = tabId; this.display(); });

    }

    private registerTabEvents(tabsEl: HTMLElement): void {
        this.ntb.registerDomEvent(tabsEl, 'keydown', (event: KeyboardEvent) => {

            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

            const tabEl = event.target;
            if (!(tabEl instanceof HTMLButtonElement)) return;

            const nextTabId: TabId = tabEl.getAttribute('aria-controls') === 'copy-text' ? 'share-uri' : 'copy-text';
            const nextTab = tabsEl.querySelector<HTMLButtonElement>( `#ntb-tab-${nextTabId}` );
            if (!nextTab) return;

            event.preventDefault();

            this.activeTab = nextTabId;

            tabEl.setAttribute('aria-selected', 'false');
            tabEl.tabIndex = -1;

            nextTab.setAttribute('aria-selected', 'true');
            nextTab.tabIndex = 0;

            const currentPanel = this.contentEl.querySelector<HTMLElement>( `#${tabEl.getAttribute('aria-controls')}` );
            const nextPanel = this.contentEl.querySelector<HTMLElement>( `#${nextTab.getAttribute('aria-controls')}` );
            if (currentPanel) currentPanel.hidden = true;
            if (nextPanel) nextPanel.hidden = false;

            nextTab.focus();
        });
    }

}
import { App, ButtonComponent, PluginSettingTab, Setting } from 'obsidian';
import NoteToolbarPlugin from '../main';
import { arraymove } from 'src/Utils/Utils';

export class NoteToolbarSettingTab extends PluginSettingTab {

	plugin: NoteToolbarPlugin;

	constructor(app: App, plugin: NoteToolbarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const name_description = document.createDocumentFragment();
		name_description.append(
			"Unique name for this toolbar.",
			name_description.createEl("br"),
			"If a `notetoolbar` property is set to use this toolbar, it will take precedence over any folder toolbars."
		);

		new Setting(this.containerEl)
			.setName("Name")
			.setDesc(name_description)
			.addText(text => text
				.setPlaceholder('Name')
				.setValue(this.plugin.settings.name)
				.onChange(async (value) => {
					this.plugin.settings.name = value;
					await this.plugin.save_settings();
				}));

		new Setting(this.containerEl)
			.setName("Menu items")
			.setDesc("Items that appear in the menu, in order.")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add menu item")
					.setButtonText("+ Add menu item")
					.setCta()
					.onClick(() => {
						this.plugin.settings.toolbar.push({
							label: "",
							url: "",
							tooltip: "",
							hide_on_desktop: false,
							hide_on_mobile: false
						});
						this.plugin.save_settings();
						this.display();
					});
			});

		this.plugin.settings.toolbar.forEach(
			(toolbar_item, index) => {
				let item_div = this.containerEl.createEl("div");
				item_div.className = "note-toolbar-setting-item";
				let row1_container = this.containerEl.createEl("div");
				row1_container.style.display = "flex";
				row1_container.style.flexFlow = "wrap-reverse";
				row1_container.style.justifyContent = "space-between";
				let text_fields_container = this.containerEl.createEl("div");
				text_fields_container.style.display = "flex";
				text_fields_container.style.flexWrap = "wrap";
				text_fields_container.style.justifyContent = "space-between";
				let text_fields_div_right = this.containerEl.createEl("div");
				text_fields_div_right.style.display = "flex";
				text_fields_div_right.style.flexWrap = "wrap";
				text_fields_div_right.style.justifyContent = "flex-end";
				let item_controls_div = this.containerEl.createEl("div");
				item_controls_div.style.marginLeft = "auto";
				const s1a = new Setting(text_fields_container)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Item label')
						.setValue(this.plugin.settings.toolbar[index].label)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].label = value;
							await this.plugin.save_settings();
						}));
				const s1b = new Setting(text_fields_div_right)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('URL')
						.setValue(this.plugin.settings.toolbar[index].url)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].url = value;
							await this.plugin.save_settings();
						}));
				const s1c = new Setting(text_fields_div_right)
					.setClass("note-toolbar-setting-item-field")
					.addText(text => text
						.setPlaceholder('Tooltip (optional)')
						.setValue(this.plugin.settings.toolbar[index].tooltip)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].tooltip = value;
							await this.plugin.save_settings();
						}));
				const s1d = new Setting(item_controls_div)
					.addExtraButton((cb) => {
						cb.setIcon("up-chevron-glyph")
							.setTooltip("Move up")
							.onClick(() => {
								arraymove(
									this.plugin.settings.toolbar,
									index,
									index - 1
								);
								this.plugin.save_settings();
								this.display();
							});
					})
					.addExtraButton((cb) => {
						cb.setIcon("down-chevron-glyph")
							.setTooltip("Move down")
							.onClick(() => {
								arraymove(
									this.plugin.settings.toolbar,
									index,
									index + 1
								);
								this.plugin.save_settings();
								this.display();
							});
					})
					.addExtraButton((cb) => {
						cb.setIcon("cross")
							.setTooltip("Delete")
							.onClick(() => {
								this.plugin.settings.toolbar.splice(
									index,
									1
								);
								this.plugin.save_settings();
								this.display();
							});
					});
				text_fields_container.appendChild(text_fields_div_right);
				row1_container.appendChild(text_fields_container);
				row1_container.appendChild(item_controls_div);
				item_div.appendChild(row1_container);
				let toggles_div = this.containerEl.createEl("div");
				toggles_div.style.display = "flex";
				toggles_div.style.justifyContent = "flex-end";
				toggles_div.style.flexWrap = "wrap";
				const s2 = new Setting(toggles_div)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("Hide on mobile")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('Hide on mobile?'))
							.setValue(this.plugin.settings.toolbar[index].hide_on_mobile)
							.onChange((hide_on_mobile) => {
								this.plugin.settings.toolbar[index].hide_on_mobile =
									hide_on_mobile;
								this.plugin.save_settings();
							});
					});
				const s3 = new Setting(toggles_div)
					.setClass("note-toolbar-setting-item-toggle")
					.setName("Hide on desktop")
					.addToggle((toggle) => {
						toggle
							.setTooltip(('Hide on desktop?'))
							.setValue(this.plugin.settings.toolbar[index].hide_on_desktop)
							.onChange((hide_on_desktop) => {
								this.plugin.settings.toolbar[index].hide_on_desktop =
									hide_on_desktop;
								this.plugin.save_settings();
							});
					});
				item_div.appendChild(toggles_div);
				this.containerEl.appendChild(item_div);
			});

	}
}
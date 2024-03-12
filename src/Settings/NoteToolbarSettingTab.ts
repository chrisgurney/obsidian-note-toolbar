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

		// this.containerEl.createEl("h2", { text: "Menu Items" });
		// const descHeading = document.createDocumentFragment();
		// descHeading.append(
		//     "Add items to this menu."
		// );
		// new Setting(this.containerEl).setDesc(descHeading);
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
				item_div.style.borderRadius = "8px";
				item_div.style.border = "1px solid var(--background-modifier-border)";
				item_div.style.margin = "1em 0em 0em 1.5em";
				item_div.style.padding = "1.5em 1.5em 0.5em 1.5em";
				let text_fields_container = this.containerEl.createEl("div");
				text_fields_container.style.display = "flex";
				text_fields_container.style.justifyContent = "space-between";
				let text_fields_div_right = this.containerEl.createEl("div");
				text_fields_div_right.style.display = "flex";
				text_fields_div_right.style.justifyContent = "flex-end";
				const s1a = new Setting(text_fields_container)
					.setClass("note-toolbar-setting-item-title")
					.addText(text => text
						.setPlaceholder('Item label')
						.setValue(this.plugin.settings.toolbar[index].label)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].label = value;
							await this.plugin.save_settings();
						}));
				const s1b = new Setting(text_fields_div_right)
					.addText(text => text
						.setPlaceholder('URL')
						.setValue(this.plugin.settings.toolbar[index].url)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].url = value;
							await this.plugin.save_settings();
						}))
					.addText(text => text
						.setPlaceholder('Tooltip (optional)')
						.setValue(this.plugin.settings.toolbar[index].tooltip)
						.onChange(async (value) => {
							this.plugin.settings.toolbar[index].tooltip = value;
							await this.plugin.save_settings();
						}))
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
				item_div.appendChild(text_fields_container);
				let toggles_div = this.containerEl.createEl("div");
				toggles_div.style.display = "flex";
				toggles_div.style.justifyContent = "flex-end";
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
				// item_div.appendChild(toggle2_span);
				this.containerEl.appendChild(item_div);
			});

	}
}
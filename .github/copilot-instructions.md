# Note Toolbar Plugin - Development Guide

## Project Overview

Note Toolbar is an Obsidian plugin that lets users create customizable toolbars for notes, supporting commands, files, URIs, menus, and scripts (Dataview, Templater, JavaScript). The plugin uses a Manager + Helper architecture where managers handle business logic and helpers provide utilities.

## Architecture

### Plugin Structure (Manager + Helper Pattern)

The main plugin class (`NoteToolbarPlugin` in [src/main.ts](../src/main.ts)) initializes components in a specific order:

1. **Managers** (business logic, coordinate features):
   - `AdapterManager` - integrates with external plugins (Dataview, Templater, JS Engine)
   - `SettingsManager` - handles settings load/save, toolbar CRUD operations
   - `CommandManager` - registers plugin commands
   - `GalleryManager` - manages pre-built toolbar items
   - `ProtocolManager` - handles `obsidian://` protocol URIs

2. **Helpers** (utilities, assist managers):
   - `ToolbarElementHelper` (`el`) - DOM element access
   - `ToolbarEventHandler` (`events`) - user interaction handling
   - `ToolbarItemHandler` (`items`) - individual item execution
   - `ToolbarRenderer` (`render`) - toolbar display logic
   - `VariableResolver` (`vars`) - variable substitution in labels/URIs

Access pattern: `this.ntb.settingsManager` for managers, `this.ntb.el` for helpers.

### Settings Architecture

Settings are centralized in [src/Settings/NoteToolbarSettings.ts](../src/Settings/NoteToolbarSettings.ts):
- `NoteToolbarSettings` - global plugin settings
- `ToolbarSettings` - individual toolbar configuration
- `ToolbarItemSettings` - individual toolbar item configuration
- All settings types use UUIDs for identification (`uuid` property)
- Settings version (`SETTINGS_VERSION`) triggers migrations when structure changes

### Type System

The `ItemType` enum defines supported toolbar item types:
- Core: `Command`, `File`, `Folder`, `Uri`, `Menu`
- Scripts: `Dataview`, `JavaScript`, `JsEngine`, `Templater`
- Layout: `Break`, `Separator`, `Group`
- Special: `Plugin` (for Gallery items requiring specific plugins)

### Adapter Pattern

External plugin integrations use the Adapter pattern ([src/Adapters/](../src/Adapters/)):
- Base: `Adapter` interface with `getFunction()` method
- Implementations: `DataviewAdapter`, `TemplaterAdapter`, `JsEngineAdapter`, `JavaScriptAdapter`
- `AdapterManager` checks plugin availability and provides adapter instances
- Use `this.ntb.adapters.getAdapterForItemType(type)` to check if a plugin is available

### API Design

Public API exposed at `window.ntb` ([src/Api/](../src/Api/)):
- Interface-first design: `INoteToolbarApi`, `IToolbar`, `IItem`
- Implementations: `NoteToolbarApi`, `Toolbar`, `Item`
- Provides suggester, prompt, modal, and menu utilities for scripts
- TypeDoc generates API documentation to [docs/wiki/api/](../docs/wiki/api/)

## Development Workflows

### Build System

esbuild configuration ([esbuild.config.mjs](../esbuild.config.mjs)) includes custom plugins:
- `typecheckPlugin` - runs TypeScript compiler on each build
- `typedocPlugin` - auto-generates API docs from interfaces
- `fileInlinerPlugin` - inlines files into CSS
- `galleryDocsPlugin` - generates Gallery documentation from JSON

Run development server (watches for changes):
```sh
npm run dev
```

Build for production:
```sh
npm run build
```

### Module Resolution

TypeScript baseUrl is set to `src/` ([tsconfig.json](../tsconfig.json)), enabling clean imports:
```typescript
import { ToolbarSettings } from 'Settings/NoteToolbarSettings';
import NoteToolbarPlugin from 'main';
```

Never use relative paths like `../../Settings/NoteToolbarSettings`.

### Translation System

i18next-based localization ([src/I18n/](../src/I18n/)):
- Translation files: `en.json`, `de.json`, `ja.json`, `uk.json`, `zh-CN.json`
- Use `t('key.path')` function for all user-facing strings
- Language codes follow Obsidian's conventions
- Never hardcode English strings in UI code

### Settings UI Patterns

Settings UI uses a component-based approach ([src/Settings/UI/](../src/Settings/UI/)):
- `NoteToolbarSettingTab` - main settings tab
- Modals in `Modals/` - `ToolbarSettingsModal`, `ItemModal`, etc.
- Suggesters in `Suggesters/` - type-ahead search components
- Separate UI logic files: `ToolbarItemUi.ts`, `ToolbarStyleUi.ts`, `RuleUi.ts`
- Use `SettingGroup` for collapsible sections, debounce text inputs

### Gallery System

Gallery items ([src/Gallery/gallery-items.json](../src/Gallery/gallery-items.json)):
- JSON structure defines pre-built toolbar items
- `plugin` property indicates required external plugin
- Gallery docs auto-generate to [docs/wiki/gallery.md](../docs/wiki/gallery.md)
- Items can have `type: "plugin"` which gets resolved by `SettingsManager.resolvePluginType()`

### Debugging

Enable debug mode in settings:
- Uses `this.ntb.settings.debugEnabled` flag
- Debug method: `this.ntb.debug(message)` (controlled by flag)
- Never commit `DEBUG = true` in SettingsManager

## Project Conventions

### UUID Management

All toolbar/item entities use UUIDs:
- Generate with `getUUID()` from [src/Utils/Utils.ts](../src/Utils/Utils.ts)
- Commands use prefixes: `COMMAND_PREFIX_TBAR`, `COMMAND_PREFIX_ITEM`
- UUIDs identify items across renames and moves

### Icon Handling

Custom icons registered in `onload()`:
- `note-toolbar-empty` - empty icon for spacing
- `note-toolbar-none` - zero-width icon
- `note-toolbar-separator` - custom separator graphic
- Use `addIcon()` before referencing in UI

### Style Classes

Styling uses BEM-like naming ([src/Styles/](../src/Styles/)):
- Component styles in separate files: `callout.css`, `menu.css`, `settings.css`
- Mobile-specific classes prefixed with `m`: `mbrder`, `mctr`, `mwd`
- Style Settings plugin integration via `style-settings.yaml`

### Release Process

Version management ([BUILD.md](../BUILD.md)):
1. Update `package.json` version
2. Run `npm run version` (updates `manifest.json`, `versions.json`)
3. Commit and push
4. Run `./release.sh {VERSION}` to create tag
5. Edit release on GitHub

Beta releases use `manifest-beta.json` with `X.Y-beta-NN` format.

### Testing Approach

Manual testing workflow:
- Test vault in separate folder
- Enable debug mode in settings
- Check console for errors
- Use BRAT plugin for beta testing

## Critical Integration Points

### Obsidian API Usage

- `MarkdownView` - accessing note content and editor
- `ItemView` - generic view handling for different file types
- `Platform.isPhone/isTablet/isDesktop` - platform detection for UI
- `WorkspaceLeaf` - managing views and rendering
- Frontmatter via `app.metadataCache.getFileCache(file)?.frontmatter`

### Plugin Communication

- Check plugin availability: `app.plugins.plugins['plugin-id']`
- Internal plugins: `app.internalPlugins.getPluginById('id')`
- Track in `AdapterManager.plugins` and `internalPluginsEnabled` objects

### Custom Protocols

Protocol handler pattern (`obsidian://note-toolbar/`):
- Implemented in [src/Protocol/ProtocolManager.ts](../src/Protocol/ProtocolManager.ts)
- Actions: execute commands, open modals, focus folders
- Used in Note Toolbar Callouts

## Common Patterns

### Accessing Plugin Instance

Most classes receive `NoteToolbarPlugin` in constructor:
```typescript
constructor(private ntb: NoteToolbarPlugin) {}
```

Then access: `this.ntb.settings`, `this.ntb.settingsManager`, `this.ntb.render`, etc.

### Settings Save Pattern

Always save after modifying settings:
```typescript
this.ntb.settings.someProperty = value;
await this.ntb.settingsManager.save();
```

### Toolbar Rendering

Render after settings changes affecting UI:
```typescript
await this.ntb.render.renderForAllLeaves();
```

### Command Registration

Dynamic commands for toolbars/items:
```typescript
this.ntb.addCommand({
    id: COMMAND_PREFIX_TBAR + toolbar.uuid,
    name: toolbar.name,
    callback: () => { /* ... */ }
});
```

Remove commands when deleting entities using `this.ntb.removeCommand()`.

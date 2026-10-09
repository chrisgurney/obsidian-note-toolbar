---
name: note-toolbar-gallery-discovery
description: "Discover and evaluate existing Note Toolbar Gallery items before recommending, designing, or creating Obsidian Note Toolbar toolbars. Use when a user wants a toolbar, formatting actions, navigation shortcuts, existing Gallery items, or reusable Note Toolbar configurations."
---

# Note Toolbar Gallery Discovery

## Purpose

Help users build effective Obsidian Note Toolbar toolbars by finding and reusing existing Gallery items before creating custom items or scripts.

The Gallery is the preferred starting point for toolbar design. Do not recreate an existing Gallery item without a specific reason.

## Sources of truth

Use these sources in order of preference:

1. Gallery catalog: https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/src/Gallery/gallery.json
2. Gallery item definitions: https://raw.githubusercontent.com/chrisgurney/obsidian-note-toolbar/master/src/Gallery/gallery-items.json
3. Gallery documentation: https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Gallery
4. Additional Gallery items: https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Additional-Gallery-items
5. Creating toolbar items: https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Creating-toolbar-items

The JSON files in the repository are the primary source for current Gallery metadata and configurations. Documentation provides descriptions and usage context, especially for items not included in the built-in catalog.

If a source is unavailable, do not invent its contents. Use another accessible source and disclose any relevant limitations.

## Workflow

### 1. Understand the user's workflow

Identify:
- The task the user wants to accomplish.
- Where the toolbar should appear: a specific note, a set of notes, the ribbon, navigation bar, tab bar, or New Tab View.
- Relevant file paths, naming conventions, and metadata.
- Required actions and preferred shortcuts.
- Optional plugin dependencies and platform constraints.

Ask only for details that materially affect the recommendation. If reasonable defaults are available, state assumptions and proceed.

### 2. Load and inspect the Gallery data

Retrieve both JSON files from the source repository or inspect local copies if available.

Before querying the data:

1. Inspect the actual JSON structure and field names.
2. Determine how catalog entries reference item definitions.
3. Identify available categories, descriptions, identifiers, configuration data, and other relevant fields.
4. Follow references between the two files rather than assuming their schemas.
5. Handle missing fields and unknown item types without failing the entire discovery process.

Do not assume that the JSON structure is unchanged between plugin versions.

### 3. Search for relevant items

Search by the user's intended outcome, not just their wording.

For example, a request for text formatting might match:
- Toggle bold
- Toggle italic
- Toggle heading
- Toggle highlight
- Toggle strikethrough
- Clear formatting
- Toggle bullet list
- Toggle numbered list
- Insert callout

A request for daily-note navigation might match:
- Previous daily note
- Today's daily note
- Next daily note

These are examples of known Gallery entries, not a substitute for checking the current catalog.

Consider synonyms, related actions, categories, descriptions, and dependencies. Return a shortlist of relevant results rather than dumping the entire catalog.

#### Category-level toolbar creation

Use `gallery.json` to identify categories and inspect their `addAsToolbar` property to determine whether they support the Gallery's **Add as toolbar** action.

- If `addAsToolbar` is `true`, the category is eligible for bulk toolbar creation.
- If `addAsToolbar` is `false`, the category cannot be added as a toolbar through this action.
- If `addAsToolbar` is absent, inspect the current implementation or documentation to determine the default behavior. If it cannot be verified, report eligibility as unknown rather than assuming the category is eligible.

When a category's items collectively fit the user's workflow, recommend **Add as toolbar**. This adds all items in the category at once and may be faster than selecting items individually.

If the category contains unrelated items or would create an unnecessarily large toolbar, recommend adding selected items individually instead.

Eligibility does not guarantee suitability: evaluate the category's contents before recommending bulk creation.

### 4. Inspect each candidate

| Recommendation | Action |
| -------------- | ------ |
| Category matches the workflow and supports bulk creation | Use **Add as toolbar** |
| Category is too broad, but contains useful items | Add selected items individually |
| Category has `addAsToolbar: false` | Add items individually or create a custom toolbar |

For every recommended item, inspect its actual definition and report available details:

- Display name and description.
- Gallery identifier or reference.
- Configured item type.
- Configured Lucide icon, if present.
- Label and tooltip, if present.
- Command identifier, URI, script, or other action configuration, where applicable.
- Required plugins, external resources, or vault access.
- Desktop, mobile, tablet, or editor-mode restrictions.
- Any special setup instructions.

Use the item's configured icon when available. Do not infer the actual icon from its label or substitute a guessed Lucide icon.

Distinguish between a missing field and a field that is explicitly empty. Do not claim a value is configured when it cannot be verified.

### 5. Design the toolbar

Group the selected items around the user's workflow.

Prefer:
- Existing Gallery items over custom implementations.
- Built-in commands over scripts when both provide the required behavior.
- A small set of frequent actions over a large, cluttered toolbar.
- Menus or groups for related secondary actions.
- Appropriate icons, labels, and tooltips based on the actual item configuration.
- Display rules that match the user's intended context.

Explain which items to add, their order, and any required configuration changes.

If no existing item meets the requirement, explain the gap and propose a custom item only when necessary.

### 6. Respect dependencies and context

Check the candidate's documented dependencies and restrictions.

Examples:
- Daily-note navigation requires the Obsidian Daily Notes core plugin.
- Periodic Notes items require the Periodic Notes plugin.
- Workspaces actions require the Workspaces core plugin.
- Templater actions require Templater.
- Some clipboard or vault-file operations have additional requirements or security implications.
- Some items are unsupported on specific platforms.

Do not assume a dependency is installed. Ask only when its presence changes the recommendation, or provide an alternative.

Also consider whether an item operates on the active file, selected text, or editor. Formatting commands generally need an appropriate editing context.

### 7. Explain how to apply the results

Give the user practical instructions:

1. Open Note Toolbar's Gallery or search for items when adding to a toolbar.
2. Select the existing items.
3. Add them to an existing toolbar or create a new one.
4. Configure labels, visibility, and display rules as needed.
5. Test the toolbar in the intended note, editor mode, and platform.

If a suitable Gallery item exists, direct the user to it instead of unnecessarily providing replacement code.

Do not claim to have modified the user's vault or created a toolbar unless an authorized tool actually performed that action.

## Output format

Present recommendations in a concise table when multiple items are involved:

| Item | Purpose | Type | Icon | Dependencies |
|---|---|---|---|---|
| Verified item name | What it does | Actual configured type | Actual configured icon, or Unknown | Verified requirements |

Omit unavailable columns when they add no value. Never fill gaps with guesses.

Then provide:
- Recommended toolbar name and placement.
- Items in suggested order.
- Any necessary display rules.
- Installation or configuration steps.
- Custom scripts only for requirements the Gallery does not satisfy.

For a small request, answer directly without a large table.

## Maintenance

The Gallery changes over time. Retrieve the current data when possible rather than relying on memorized item names, categories, icons, or counts.

When working from a local checkout, identify the checked-out revision if relevant. When working from a remote source, note that the current default branch may not match the user's installed plugin version.

If catalog entries and item definitions disagree, report the discrepancy and avoid presenting uncertain configuration as verified.

## Guiding principle

Discover first, reuse second, customize last.
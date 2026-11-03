<!-- Generated from docs/wiki/Variables.md by build/copy-skill-references.mjs. Do not edit by hand. To update, run: npm run build:skills -->

Variables can be used in any item and let you substitute the note's title or properties into labels, tooltips, and URIs (including links to files in your vault).

<img src="https://github.com/chrisgurney/obsidian-note-toolbar/assets/17337703/4175144b-558b-4c9c-b306-fdb8ea70c80e" title="Example of using a variable in a URI" width="400"/>

> [!tip]
> Tooltips, labels, and URIs also support the use of [[Dataview]] expressions, and [[Templater]] commands, if you need even more dynamic values in your toolbars like dates.

## Supported variables

The following variables are supported within labels, tooltips, and URIs:

| Variable | What it is |
| --- | --- |
| `{{dv: ... }}` | Dataview expression (or you can use Dataview's prefix, which defaults to `=`).<br/>Example: `{{dv: dateformat(date(today), "MMM d")}}` |
| `{{file_path}}` | Path to the file, from the root of the vault. |
| `{{js: ... }}` | JavaScript expression.<br/>Example: `{{js: return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}}` |
| `{{jse: ... }}` | JS Engine expression.<br/>Example: `{{jse: return app.workspace.activeEditor.file.basename}}` |
| `{{note_title}}` | The name of the current note, without the file extension. |
| `{{prop_NAME}}` | Property in the current note with the given name. e.g., if you have a property called "date" use `{{prop_date}}` Notes:  If the property does not exist, the variable will be blank. List properties become comma-separated lists. |
| `{{selection}}` | Populated with the currently selected text, or with the word at the cursor position.<br/>Example: Search for the current selection in your vault with this URI: `obsidian://search?query={{encode:selection}}` |
| `{{tp: ... }}` | Templater expression (or you can use Templater tags: `<%` and `%>`).<br/>Example: `{{tp: tp.date.now("MMM Do")}}` |
| `{{vault_path}}` | Path to the vault on your file system. |

Notes:

- If a link with variables resolves to an empty value, then the item will be hidden from the toolbar. For example, if the `next` property is referenced in a URI link using `{{prop_next}}`, and the property is empty or doesn't exist, the toolbar item will not be displayed.

[Let me know ↗](https://github.com/chrisgurney/obsidian-note-toolbar/discussions/categories/ideas) if you have ideas for variables you would like to see added.

### Example

If your property is called `url` and `url` = `google.com` then: 

- Setting URI to `{{prop_url}}` and then clicking on it will create a note called `google.com`
- To make it a link, either:
  - add the protocol in the toolbar item:`https://{{prop_url}}` or 
  - put the `https://` in the property itself: i.e., `url` = `https://google.com`

## Encoding variables

All variables (except for scripts) support an `encode:` prefix which encodes that variable using `encodeURIComponent()`.

For example, here's a URI for **Open in VS Code** (available in the [[Gallery]]) using [VS Code's URL handling ↗](https://code.visualstudio.com/docs/configure/command-line#_opening-vs-code-with-urls) to open the current file:
```
vscode://file/{{encode:vault_path}}%2F{{encode:file_path}}
```

## Demo

![CleanShot 2024-07-03 at 15 36 29](https://github.com/chrisgurney/obsidian-note-toolbar/assets/17337703/d885e41e-c829-463c-a181-a29ab8e03ff7)

---

### Read next: [[Styling toolbars]]
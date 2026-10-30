# Custom icons

If there's a Lucide icon that doesn't quite fit the plugin's use case, here's how to create one:

1. Copy any [Lucide icon](https://lucide.dev/) you want to modify by using the site's **Copy SVG** button.
    - Paste it into a design tool like [Figma](https://www.figma.com/) (free to use, with limited projects).
2. In the design tool:
    - **resize to 100 x 100**
    - set the **stroke size to 7**
    - make your changes
    - **save as SVG**
3. Use [ImageOptim](https://imageoptim.com/) to **optimize the SVG file**.
4. **Edit the SVG file by hand** (e.g., in TextEdit/Notepad):
    - Change stroke colors to `stroke="currentColor"`
    - Add `fill="none"` on `<g>` or individual `<path>` elements (your shapes may get filled in by Obsidian otherwise).
5. **Copy the *contents*** of the `<svg>` element.
    - Why? `setIcon()` seems to add its own `<svg>` element wrapper.
6. **In your plugin code**:
    - Use `addIcon()` to add the icon for use.
    - Prefix icon names with your plugin's ID (which I believe this is necessary to avoid possible conflicts).
    - Example: `addIcon('note-toolbar-pen-book', '<g fill="none" stroke="currentColor" ...');`
7. **Use the icon** as you normally would via `setIcon()`.

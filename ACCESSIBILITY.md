# Accessibility

Note Toolbar is a plugin for Obsidian. It adds customizable toolbars to your notes, and it should be usable by everyone, including people with disabilities and people using assistive technology. This document explains what the plugin does for accessibility today, what contributors should keep in mind, how to report a barrier, and what is still limited.

Note Toolbar runs inside Obsidian, so some of the experience depends on Obsidian itself: its keyboard handling, its themes, and its support for assistive technology on each platform.

## Priorities

- **Accessibility target:** We work toward [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22). This target guides the work; it is not a claim of verified conformance. No formal conformance evaluation has been done.
- **Keyboard support:** Every interactive element should be reachable and operable with a keyboard alone, with a visible focus indicator and a logical order.
- **Screen reader support:** Toolbar items and settings controls should have clear names and states, so they should be able to be used with VoiceOver, NVDA, JAWS, TalkBack, and similar tools, though this has not been tested.
- **Readable content:** Plain language where possible, descriptive link text, sufficient color contrast, and meaning never carried by color alone.
- **Translations:** The plugin interface is available in several languages.

## What the plugin does today

### Keyboard navigation

- Use the `Note Toolbar: Focus` command to put keyboard focus in a toolbar, then move between items with the arrow keys and activate with Enter or Space. You can assign a shortcut to the command in Obsidian under **Settings → Hotkeys**.
- The settings UI is designed to be fully keyboard navigable.
- Toolbar items show a visible focus ring when navigated by keyboard.

### Screen readers

- Every toolbar item has an accessible name, even when its label is hidden and no tooltip is set. The name falls back through the item's label, its tooltip, the name of the command it runs, the name of its destination (file, folder, linked toolbar, or website), and finally the words in its icon name.
- Items that are not available (for example, a command from a disabled plugin) are announced as disabled, and they stay focusable so their state can be reached.
- The floating action button has an accessible name.

### Colors, contrast, and target size

- Toolbar items use Obsidian's color variables, so they follow your theme. If you need higher contrast, use a theme, the Style Settings plugin, or a CSS snippet that sets these variables with higher-contrasting colors:
- item background color (on hover): `--cg-nt-item-bg-color-hover`
- item text color: `--cg-nt-item-text-color`
- item text color (on hover): `--cg-nt-item-text-color-hover`
- toolbar background color: `--cg-nt-tbar-bg-color`
- At default settings, toolbar items are sized above the WCAG 2.2 AA minimum target size of 24 by 24 pixels.

## Contributor expectations

If you are contributing content or code, please follow these guardrails so we do not regress accessibility:

- **Keyboard-only pass:** For any change involving interactive UI, do at least one keyboard-only pass. Tab order should be logical, a visible focus indicator should always be present, all actions should work by keyboard, and there should be no keyboard trap.
- **Screen reader spot-check:** For new components or significant changes, check that controls have clear names, that custom controls expose the right role and state, and that dynamic updates (errors, notices) are announced.
- **Documentation and content:** Use a logical heading hierarchy, real list elements, descriptive link text, and meaningful alternative text for images. Do not use color as the only way to convey meaning.
- **CI:** The project does not currently run automated accessibility checks in CI. For UI changes, the keyboard-only pass above is the check.

## Reporting accessibility issues

If you run into an accessibility barrier, please let us know. We treat accessibility reports as expertise, not complaints.

1. [Open an issue](https://github.com/chrisgurney/obsidian-note-toolbar/issues/new). Use the bug report template, or just describe the barrier in your own words.
2. Include, when you can:

- What you were trying to do and what went wrong.
- Steps to reproduce.
- Your operating system, Obsidian version, and assistive technology (with versions).
- A screenshot or recording, if you are comfortable sharing one.
- How severe the barrier is for you, using the scale below (optional).

### Severity

Suggest a level when you report, if you can; the level is confirmed during triage, and leaving it out is fine.

- **Critical:** Prevents you from completing a core task (for example, you cannot use a toolbar at all with a keyboard).
- **Serious:** Significant difficulty, but a workaround exists.
- **Moderate:** Annoyance or inconsistent experience.
- **Minor:** Small issue with minimal impact on usability.

### How we respond

- We will acknowledge your report promptly, respectfully, and constructively.
- We will not require you to disclose a diagnosis or other personal information.
- We will explain next steps, known limitations, and relevant dependencies.
- Where possible, we will provide a workaround while a fix is in progress.
- We will provide updates when the status or expected timeline changes.
- We may ask you to confirm that a fix resolves the barrier before closing the issue.
- We will thank you for helping improve the project.

### Resolution expectations

Maintenance is primarily done by one person, so there are no fixed resolution dates. Accessibility issues are prioritized by severity, with barriers that block a core task first. If a fix will take a while, the delay will be explained and any available workarounds will be shared.

## Ownership and maintenance

Accessibility is owned by the project maintainer, Chris Gurney, who triages accessibility reports, tracks known barriers, and keeps this document current.

## Supported environments

Note Toolbar runs inside Obsidian on desktop (Windows, macOS, Linux) and mobile (iOS, Android), for Obsidian 1.11 and later. Screen reader support is designed in (names, roles, and states), but it has not been formally tested with a specific screen reader. If you use one, reports from real use are especially welcome.

## Known limitations

- **Tab stays inside a toolbar.** On position toolbars (top, bottom, properties) and floating toolbars, Tab moves between items instead of leaving the toolbar. In reading mode, Escape moves focus out. In editing mode there is currently no keyboard-only way out; use a mouse or touch to move focus elsewhere.
- **The text toolbar has no keyboard path in editing mode.** The toolbar that appears when you select text cannot be reached by keyboard while editing. You can reach it with a mouse or touch. The `Note Toolbar: Focus` command reaches position toolbars, not floating ones.

If you find another barrier, please open an accessibility issue using the reporting process above.

## Feedback

Accessibility is ongoing work, not a one-time fix. If you have suggestions for improving this statement or the plugin's accessibility, please open an issue or a pull request. For day-to-day guidance, see the [Accessibility page in the User Guide](https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Accessibility).
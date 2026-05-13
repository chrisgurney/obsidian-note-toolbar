# Note Toolbar Skills

Skills provide context for AI coding agents to let them interact with [Note Toolbar](https://github.com/chrisgurney/obsidian-note-toolbar) from your Obsidian vault.

## Installation

Clone or download the skills from this repository, then copy them to the appropriate directory for your agent (e.g., `.claude/skills/` or `~/.codex/skills/`).

Alternately, try asking:
```
Install the skills from github.com/kepano/obsidian-skills

Install the skills from github.com/chrisgurney/obsidian-note-toolbar/skills
```

## Usage

Once installed, the agent will automatically select the appropriate skill when your request matches. You can also invoke one explicitly:

> "Using the Note Toolbar CLI, create a toolbar called Formatting and add a Bold command item to it."

## Available skills

| Skill | Description |
|-------|-------------|
| [`note-toolbar-api`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/skills/note-toolbar-api/SKILL.md) | Write, edit, or debug JavaScript using the Note Toolbar `ntb` API inside Obsidian |
| [`note-toolbar-callouts`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/skills/note-toolbar-callouts/SKILL.md) | Create and edit Note Toolbar Callouts (toolbars within `.md` files) |
| [`note-toolbar-cli`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/skills/note-toolbar-cli/SKILL.md) | Create and manage toolbars, add and use items via the Note Toolbar CLI |
| [`note-toolbar-variables`](https://github.com/chrisgurney/obsidian-note-toolbar/tree/master/skills/note-toolbar-variables/SKILL.md) | Specifications for variable parts of item labels, tooltips, or URI fields |
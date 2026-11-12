/**
 * Stand-in for the plugin class (`src/main.ts`).
 *
 * Production modules import NoteToolbarPlugin from "main" only to use it
 * as a *type* (constructor parameters). Importing the real main.ts in a
 * test would drag in the entire plugin and the Obsidian runtime, so it
 * is aliased to this stub instead.
 */
export default class NoteToolbarPlugin {}

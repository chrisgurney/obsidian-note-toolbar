import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([

	globalIgnores([ "build/*", "examples/*", "main.js", "*.mjs" ]),
	
	{
		files: [ "**/*.ts" ],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				'i18next': 'readonly',
				'activeDocument': 'readonly',
				'activeWindow': 'readonly',
				'createDiv': 'readonly',
				'createEl': 'readonly',
				'createFragment': 'readonly',
				'createSpan': 'readonly',
				'createSvg': 'readonly',
				'isBoolean': 'readonly',
				'sleep': 'readonly',
			},
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module"
			},
		},
		plugins: { 
			obsidianmd,
			"@typescript-eslint": tsPlugin
		},
	},

	// bring in Obsidian's recommended rules
	...obsidianmd.configs.recommended,

	// IGNORE TS + ESLINT BASIC RULES FOR NOW
	{
		rules: {
			...Object.fromEntries(
				Object.keys(tsPlugin.rules).map(r => [`@typescript-eslint/${r}`, "off"])
			)
		}
	}

]);
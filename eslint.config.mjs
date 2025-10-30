import obsidianmd from "eslint-plugin-obsidianmd";

import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([

	globalIgnores([
		"build/*",
		"examples/*",
		"main.js",
		"*.mjs",
	]),
	
	{
		files: [ "**/*.ts" ],
		languageOptions: {
			globals: {
				...globals.node,
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
			'no-undef': 'off',
			...Object.fromEntries(
				Object.keys(tsPlugin.rules).map(r => [`@typescript-eslint/${r}`, "off"])
			)
		}
	}

]);
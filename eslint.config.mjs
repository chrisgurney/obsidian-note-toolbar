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
				// TODO: remove once globals are included in the Obsidian plugin
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

	{
		rules: {
			// IGNORE TS-ESLINT BASIC RULES FOR NOW
			...Object.fromEntries(
				Object.keys(tsPlugin.rules).map(r => [`@typescript-eslint/${r}`, "off"])
			),
			
			// COMMENT BACK IN BELOW SUGGESTED LIST TO TACKLE ONE-BY-ONE

			// '@typescript-eslint/no-unused-vars': 'error',

			// MEMORY
			// Prevents forgetting to unsubscribe/cleanup
			// "@typescript-eslint/no-misused-promises": "error",
			// Catches promises that should be awaited (prevents unhandled rejections)
			// "@typescript-eslint/no-floating-promises": "error",
			// Prevents creating functions inside loops (new function instance each iteration)
			// "@typescript-eslint/no-loop-func": "error",
 
			// PERFORMANCE
			// Prevents unnecessary async/await overhead
			// "@typescript-eslint/require-await": "warn",
			// Avoids expensive string concatenation in loops
			// "@typescript-eslint/prefer-string-starts-ends-with": "error",
			// Use optional chaining (more optimized by engines)
			// "@typescript-eslint/prefer-optional-chain": "warn",
			// Prevents unnecessary type assertions that can hide performance issues
			// "@typescript-eslint/no-unnecessary-type-assertion": "error",
			// Catches redundant conditionals that waste cycles
			// "@typescript-eslint/no-unnecessary-condition": "warn"

		}
	}

]);
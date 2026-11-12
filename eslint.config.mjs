// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import tseslint from 'typescript-eslint';
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import { deprecate } from "node:util";

export default defineConfig([

  // tests/ and the Vitest config are not part of the shipped plugin and are
  // not in tsconfig's include (src/**), so the type-checked lint below
  // cannot process them; Vitest/esbuild handles them instead
  { ignores: ['build/**', 'docs/**', '*.mjs', '**/main.js', 'tests/**', 'vitest.config.ts'] },

  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parser: tsparser,
      parserOptions: { 
        projectService: true
      },
    },

    // You can add your own configuration to override or add rules
    rules: {
      // "@typescript-eslint/no-deprecated": "off",
      // temporary: will update for 1.13 support in a future release
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",
    },
  },
]);
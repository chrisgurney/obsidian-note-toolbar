// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import tseslint from 'typescript-eslint';
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([

  { ignores: ['build/**', 'examples/**', '**/main.js'] },

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
    },
  },
]);
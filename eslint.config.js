import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import unicornPlugin from "eslint-plugin-unicorn";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: ["_site/**", "node_modules/**"],
  },

  js.configs.recommended,

  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".mjs"],
        },
      },
    },
  },

  {
    plugins: {
      unicorn: unicornPlugin,
    },
    rules: {
      ...unicornPlugin.configs.recommended.rules,
      // Disable some opinionated rules that might not fit all projects
      "unicorn/prevent-abbreviations": "off",
      "unicorn/filename-case": "off",
    },
  },

  {
    files: [
      ".eleventy.js",
      "_data/**/*.js",
      "blog/**/*.11tydata.js",
      "scripts/**/*.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },

  {
    files: ["js/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },

  prettierConfig,
];

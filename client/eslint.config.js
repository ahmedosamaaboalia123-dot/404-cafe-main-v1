import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const asWarnings = (rules) => Object.fromEntries(
  Object.entries(rules).map(([name, value]) => [name, Array.isArray(value) ? ["warn", ...value.slice(1)] : "warn"]),
);

export default [
  { ignores: ["dist/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", "reports/**", ".certs/**"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...asWarnings(js.configs.recommended.rules),
      ...asWarnings(reactHooks.configs.recommended.rules),
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
];

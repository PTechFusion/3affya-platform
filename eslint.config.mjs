import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import logicalCss from "./eslint/logical-css.mjs";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    plugins: { "3affya": logicalCss },
    rules: {
      "3affya/no-physical-utilities": "error",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "public/**", "docs/**", "scripts/screenshots/**"]),
]);

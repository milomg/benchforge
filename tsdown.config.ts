import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/bin/benchforge.ts",
  format: "esm",
  target: "node22",
  clean: true,
  dts: true,
  sourcemap: true,
  platform: "node",
  external: [
    "esbuild",
    "open",
    "picocolors",
    "playwright",
    "table",
    "yargs",
    "yargs/helpers",
  ],
  checks: { eval: false },
  logLevel: "warn",
});

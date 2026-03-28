import type { Argv, InferredOptionTypes } from "yargs";
import yargs from "yargs";

export type Configure<T> = (yargs: Argv) => Argv<T>;

/** CLI args type inferred from cliOptions */
export type DefaultCliArgs = InferredOptionTypes<typeof cliOptions>;

// biome-ignore format: compact option definitions
const cliOptions = {
  url:              { type: "string",  requiresArg: true, describe: "page URL for browser profiling", demandOption: true },
  time:           { type: "number",  default: 0.642, requiresArg: true, describe: "test duration in seconds" },
  iterations:       { type: "number",  requiresArg: true, describe: "exact number of iterations (overrides --time)" },
  "gc-stats":     { type: "boolean", default: false, describe: "collect GC statistics via CDP tracing" },
  "view-report":        { type: "boolean", default: false, describe: "open HTML report in browser" },
  "export-report":      { type: "string",  requiresArg: true, describe: "export HTML report to file" },
  "export-json":        { type: "string",  requiresArg: true, describe: "export benchmark data to JSON file" },
  "export-perfetto":    { type: "string",  requiresArg: true, describe: "export Perfetto trace file (view at ui.perfetto.dev)" },
  "view-alloc":         { type: "boolean", default: false, describe: "open allocation profile in viewer" },
  "export-alloc":       { type: "string",  requiresArg: true, describe: "export allocation profile (speedscope JSON format)" },
  "heap-sample":    { type: "boolean", default: false, describe: "heap sampling allocation attribution" },
  "heap-interval":  { type: "number",  default: 32768, describe: "heap sampling interval in bytes" },
  "heap-depth":     { type: "number",  default: 64, describe: "heap sampling stack depth" },
  "heap-rows":      { type: "number",  default: 20, describe: "top allocation sites to show" },
  "heap-stack":     { type: "number",  default: 3, describe: "call stack depth to display" },
  "heap-verbose":   { type: "boolean", default: false, describe: "verbose output with file:// paths and line numbers" },
  "heap-raw":       { type: "boolean", default: false, describe: "dump every raw heap sample (ordinal, size, stack)" },
  "heap-user-only": { type: "boolean", default: false, describe: "filter to user code only" },
  headless:         { type: "boolean", default: true, describe: "run browser in headless mode" },
  timeout:          { type: "number",  default: 60, describe: "browser page timeout in seconds" },
  "chrome-args":    { type: "string",  array: true, requiresArg: true, describe: "extra Chromium flags" },
} as const;

/** @return yargs with browser benchmark options */
export function defaultCliArgs(yargsInstance: Argv): Argv<DefaultCliArgs> {
  return yargsInstance
    .command("$0", "run browser benchmarks", y => {
      y.option(cliOptions);
    })
    .help()
    .strict() as Argv<DefaultCliArgs>;
}

/** @return parsed command line arguments */
export function parseCliArgs<T = DefaultCliArgs>(
  args: string[],
  configure: Configure<T> = defaultCliArgs as Configure<T>,
): T {
  const yargsInstance = configure(yargs(args));
  return yargsInstance.parseSync() as T;
}

export const browserCliArgs = defaultCliArgs;

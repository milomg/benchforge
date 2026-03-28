import pico from "picocolors";
import type { BenchSuite } from "../Benchmark.ts";
import {
  type BrowserProfileResult,
  profileBrowser,
} from "../browser/BrowserHeapSampler.ts";
import {
  exportAndLaunchSpeedscope,
  exportSpeedscope,
} from "../export/AllocExport.ts";
import {
  aggregateSites,
  filterSites,
  flattenProfile,
  formatHeapReport,
  formatRawSamples,
  type HeapReportOptions,
} from "../heap-sample/HeapSampleReport.ts";
import { resolveProfile } from "../heap-sample/ResolvedProfile.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import { formatBytes } from "../table-util/Formatters.ts";
import {
  type Configure,
  type DefaultCliArgs,
  parseCliArgs,
} from "./CliArgs.ts";

const { dim } = pico;

export interface ExportOptions {
  results: { reports: { name: string; measuredResults: MeasuredResults }[] }[];
  args: DefaultCliArgs;
}

/** Run benchmarks and display table. Only supports browser mode (--url). */
export async function runDefaultBench(
  _suite?: BenchSuite,
  configureArgs?: Configure<any>,
): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2), configureArgs);
  if (args.url) {
    await browserBenchExports(args);
  } else {
    throw new Error(
      "Only browser mode is supported. Provide a page URL with --url.",
    );
  }
}

/** Run browser benchmark and export results */
async function browserBenchExports(args: DefaultCliArgs): Promise<void> {
  const url = args.url!;

  console.log(`◊ Running browser benchmark: ${url}`);

  const result = await profileBrowser({
    url,
    heapSample: args["heap-sample"],
    heapOptions: {
      samplingInterval: args["heap-interval"],
      stackDepth: args["heap-depth"],
    },
    headless: args.headless,
    chromeArgs: args["chrome-args"]
      ?.flatMap(a => a.split(/\s+/))
      .map(stripQuotes)
      .filter(Boolean),
    timeout: args.timeout,
    gcStats: args["gc-stats"],
  });

  const name = new URL(url).pathname.split("/").pop() || "browser";
  const results = browserResultGroups(name, result);

  printBrowserReport(result, results, args);
  await exportReports({ results, args });
}

/** Print browser benchmark summary */
function printBrowserReport(
  result: BrowserProfileResult,
  results: ExportOptions["results"],
  args: DefaultCliArgs,
): void {
  if (result.gcStats) {
    const { scavenges, markCompacts, totalCollected, gcPauseTime } =
      result.gcStats;
    const collected = formatBytes(totalCollected, { space: true });
    console.log(
      `\n  scavenges: ${scavenges}  full GCs: ${markCompacts}  collected: ${collected}  pause: ${gcPauseTime.toFixed(1)}ms`,
    );
  }
  if (result.heapProfile) {
    printHeapReports(results, {
      userOnly: args["heap-user-only"],
      topN: args["heap-rows"],
      stackDepth: args["heap-stack"],
      verbose: args["heap-verbose"],
      raw: args["heap-raw"],
    });
  }
}

/** Wrap browser results in report groups */
function browserResultGroups(
  name: string,
  result: BrowserProfileResult,
): ExportOptions["results"] {
  const measured: MeasuredResults = {
    name,
    samples: result.samples || [],
    gcStats: result.gcStats,
    heapProfile: result.heapProfile,
    totalTime: result.wallTimeMs ? result.wallTimeMs / 1000 : 0,
  };
  return [{ reports: [{ name, measuredResults: measured }] }];
}

/** Export results to various formats based on CLI args */
export async function exportReports(options: ExportOptions): Promise<void> {
  const { results, args } = options;
  const { "export-alloc": allocFile, "view-alloc": viewAlloc } = args;

  if (allocFile) {
    await exportSpeedscope(results, allocFile);
  }

  if (viewAlloc) {
    await exportAndLaunchSpeedscope(results);
  }
}

/** Print heap allocation reports for benchmarks with heap profiles */
export function printHeapReports(
  groups: ExportOptions["results"],
  options: HeapReportOptions,
): void {
  for (const group of groups) {
    for (const report of group.reports) {
      const { heapProfile } = report.measuredResults;
      if (!heapProfile) continue;

      console.log(dim(`\n─── Heap profile: ${report.name} ───`));
      const resolved = resolveProfile(heapProfile);
      const sites = flattenProfile(resolved);
      const userSites = filterSites(sites, () => true); // Simplification: all sites are user sites for now
      const totalUserCode = userSites.reduce((sum, s) => sum + s.bytes, 0);
      const aggregated = aggregateSites(options.userOnly ? userSites : sites);
      const extra = {
        totalAll: resolved.totalBytes,
        totalUserCode,
        sampleCount: resolved.sortedSamples?.length,
      };
      console.log(formatHeapReport(aggregated, { ...options, ...extra }));
      if (options.raw) {
        console.log(dim(`\n─── Raw samples: ${report.name} ───`));
        console.log(formatRawSamples(resolved));
      }
    }
  }
}

function stripQuotes(s: string): string {
  return s.replace(/^['"]|['"]$/g, "");
}

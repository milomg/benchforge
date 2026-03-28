import pc from "picocolors";
import { formatBytes } from "../Formatters.ts";
import {
  type HeapSite,
  isUserCode,
  type ResolvedFrame,
  type ResolvedProfile,
} from "./ResolvedProfile.ts";

export interface HeapReportOptions {
  topN: number;
  stackDepth?: number;
  verbose?: boolean;
  raw?: boolean; // dump every raw sample
  totalAll?: number; // total across all nodes
  sampleCount?: number; // number of samples taken
}

/** Aggregate sites by location (combine same file:line:col).
 *  Tracks distinct caller stacks with byte weights when merging. */
export function aggregateSites(sites: HeapSite[]): HeapSite[] {
  const byLocation = new Map<string, HeapSite>();

  for (const site of sites) {
    const f = site.frame;
    // When column is unknown, include fn name to avoid merging distinct sites
    const key =
      f.col != null
        ? `${f.url}:${f.line}:${f.col}`
        : `${f.url}:${f.line}:?:${f.name}`;
    const existing = byLocation.get(key);
    if (existing) {
      existing.bytes += site.bytes;
      addCaller(existing, site);
    } else {
      const entry: HeapSite = {
        frame: { ...site.frame },
        bytes: site.bytes,
        stack: site.stack,
        callers: site.stack
          ? [{ stack: site.stack, bytes: site.bytes }]
          : undefined,
      };
      byLocation.set(key, entry);
    }
  }

  // Sort callers by bytes descending, use top caller as primary stack
  for (const site of byLocation.values()) {
    if (site.callers && site.callers.length > 1) {
      site.callers.sort((a, b) => b.bytes - a.bytes);
      site.stack = site.callers[0].stack;
    }
  }

  return [...byLocation.values()].sort((a, b) => b.bytes - a.bytes);
}

/** Format heap report for console output */
export function formatHeapReport(
  sites: HeapSite[],
  options: HeapReportOptions,
): string {
  const { topN, stackDepth = 3, verbose = false } = options;
  const { totalAll, sampleCount } = options;
  const lines: string[] = [];
  lines.push(`Heap allocation sites (top ${topN}, garbage included):`);

  for (const site of sites.slice(0, topN)) {
    if (verbose) {
      formatVerboseSite(lines, site, stackDepth);
    } else {
      formatCompactSite(lines, site, stackDepth);
    }
  }

  lines.push("");
  if (totalAll !== undefined) lines.push(`Total: ${fmtBytes(totalAll)}`);
  if (sampleCount !== undefined)
    lines.push(`Samples: ${sampleCount.toLocaleString()}`);

  return lines.join("\n");
}

/** Format every raw sample as one line, ordered by ordinal (time).
 *  Output is tab-separated for easy piping/grep/diff. */
export function formatRawSamples(resolved: ResolvedProfile): string {
  if (!resolved.sortedSamples || resolved.sortedSamples.length === 0) {
    return "No raw samples available.";
  }

  const lines: string[] = ["ordinal\tsize\tfunction\tlocation"];
  for (const s of resolved.sortedSamples) {
    const node = resolved.nodeMap.get(s.nodeId);
    const fn = node?.frame.name || "(unknown)";
    const url = node?.frame.url || "";
    const loc = url
      ? fmtLoc(url, node!.frame.line, node!.frame.col)
      : "(unknown)";
    lines.push(`${s.ordinal}\t${s.size}\t${fn}\t${loc}`);
  }
  return lines.join("\n");
}

/** Add a caller stack to an aggregated site, merging if the same path exists */
function addCaller(existing: HeapSite, site: HeapSite): void {
  if (!site.stack) return;
  if (!existing.callers) existing.callers = [];
  const key = callerKey(site.stack);
  const match = existing.callers.find(c => callerKey(c.stack) === key);
  if (match) {
    match.bytes += site.bytes;
  } else {
    existing.callers.push({ stack: site.stack, bytes: site.bytes });
  }
}

/** Verbose multi-line format with file:// paths and line numbers */
function formatVerboseSite(
  lines: string[],
  site: HeapSite,
  stackDepth: number,
): void {
  const { frame } = site;
  const bytes = fmtBytes(site.bytes).padStart(10);
  const loc = frame.url
    ? fmtLoc(frame.url, frame.line, frame.col)
    : "(unknown)";
  const dimFn = isUserCode(frame) ? (s: string) => s : pc.dim;

  lines.push(dimFn(`${bytes}  ${frame.name}  ${loc}`));

  if (site.stack && site.stack.length > 1) {
    const callers = site.stack.slice(0, -1).reverse().slice(0, stackDepth);
    for (const f of callers) {
      if (!f.url || !isUserCode(f)) continue;
      const callerLoc = fmtLoc(f.url, f.line, f.col);
      lines.push(dimFn(`            <- ${f.name}  ${callerLoc}`));
    }
  }
}

/** Compact single-line format: `49 MB  fn1 <- fn2 <- fn3` */
function formatCompactSite(
  lines: string[],
  site: HeapSite,
  stackDepth: number,
): void {
  const { frame } = site;
  const bytes = fmtBytes(site.bytes).padStart(10);
  const fns = [frame.name];

  if (site.stack && site.stack.length > 1) {
    const callers = site.stack.slice(0, -1).reverse().slice(0, stackDepth);
    for (const f of callers) {
      if (!f.url || !isUserCode(f)) continue;
      fns.push(f.name);
    }
  }

  const line = `${bytes}  ${fns.join(" <- ")}`;
  lines.push(isUserCode(frame) ? line : pc.dim(line));
}

function fmtBytes(bytes: number): string {
  return formatBytes(bytes, { space: true }) ?? `${bytes} B`;
}

/** Format location, omitting column when unknown */
function fmtLoc(url: string, line: number, col?: number): string {
  return col != null ? `${url}:${line}:${col}` : `${url}:${line}`;
}

/** Serialize a call stack for dedup comparison */
function callerKey(stack: ResolvedFrame[]): string {
  return stack.map(f => `${f.url}:${f.line}:${f.col}`).join("|");
}

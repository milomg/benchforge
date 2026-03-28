import type { ReportColumnGroup, ResultsMapper } from "./BenchmarkReport.ts";
import type { MeasuredResults } from "./MeasuredResults.ts";
import {
  formatBytes,
  integer,
  timeMs,
} from "./table-util/Formatters.ts";

export interface TimeStats {
  mean?: number;
  p50?: number;
  p99?: number;
}

export interface GcStatsInfo {
  collected?: number;
  scavenges?: number;
  fullGCs?: number;
  pausePerIter?: number;
}

export interface RunStats {
  runs?: number;
}

/** Section: mean, p50, p99 timing */
export const timeSection: ResultsMapper<TimeStats> = {
  extract: (results: MeasuredResults) => ({
    mean: results.time?.avg,
    p50: results.time?.p50,
    p99: results.time?.p99,
  }),
  columns: (): ReportColumnGroup<TimeStats>[] => [
    {
      groupTitle: "time",
      columns: [
        { key: "mean", title: "mean", formatter: timeMs, comparable: true },
        { key: "p50", title: "p50", formatter: timeMs, comparable: true },
        { key: "p99", title: "p99", formatter: timeMs, comparable: true },
      ],
    },
  ],
};

/** Browser GC section: only fields available from CDP tracing */
export const browserGcStatsSection: ResultsMapper<GcStatsInfo> = {
  extract: (results: MeasuredResults) => {
    const { gcStats, samples } = results;
    if (!gcStats) return {};
    const iterations = samples.length || 1;
    return {
      collected: gcStats.totalCollected || undefined,
      scavenges: gcStats.scavenges,
      fullGCs: gcStats.markCompacts,
      pausePerIter: gcStats.gcPauseTime / iterations,
    };
  },
  columns: (): ReportColumnGroup<GcStatsInfo>[] => [
    {
      groupTitle: "gc",
      columns: [
        { key: "collected", title: "collected", formatter: formatBytes },
        { key: "scavenges", title: "scav", formatter: integer },
        { key: "fullGCs", title: "full", formatter: integer },
        { key: "pausePerIter", title: "pause", formatter: timeMs },
      ],
    },
  ],
};

/** Section: number of sample iterations */
export const runsSection: ResultsMapper<RunStats> = {
  extract: (results: MeasuredResults) => ({
    runs: results.samples.length,
  }),
  columns: (): ReportColumnGroup<RunStats>[] => [
    { columns: [{ key: "runs", title: "runs", formatter: integer }] },
  ],
};

/** Section: total sampling duration in seconds (brackets if >= 30s) */
export const totalTimeSection: ResultsMapper<{ totalTime?: number }> = {
  extract: (results: MeasuredResults) => ({
    totalTime: results.totalTime,
  }),
  columns: (): ReportColumnGroup<{ totalTime?: number }>[] => [
    {
      columns: [
        {
          key: "totalTime",
          title: "time",
          formatter: v => {
            if (typeof v !== "number") return "";
            return v >= 30 ? `[${v.toFixed(1)}s]` : `${v.toFixed(1)}s`;
          },
        },
      ],
    },
  ],
};

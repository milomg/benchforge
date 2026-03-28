import type { HeapProfile } from "./heap-sample/HeapSampler.ts";
import type { GcStats } from "./GcStats.ts";
import type { SampleTimeStats } from "./StatisticalUtils.ts";

/** Benchmark results: times in milliseconds, sizes in kilobytes */
export interface MeasuredResults {
  name: string;

  /** Raw execution time samples for custom statistics */
  samples: number[];

  /** Warmup iteration timings (ms) */
  warmupSamples?: number[];

  /** Performance statistics (ms) */
  time: SampleTimeStats & {
    p25?: number;
    p95?: number;
    cv?: number;
    mad?: number;
    outlierRate?: number;
  };

  /** Total time spent collecting samples (seconds) */
  totalTime?: number;

  /** GC stats from CDP tracing */
  gcStats?: GcStats;

  /** Heap sampling allocation profile (requires --heap-sample) */
  heapProfile?: HeapProfile;
}

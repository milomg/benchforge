import type { GcStats } from "./GcStats.ts";
import type { HeapProfile } from "./heap-sample/HeapSampler.ts";

/** Benchmark results */
export interface MeasuredResults {
  name: string;

  /** Raw execution time samples */
  samples: number[];

  /** Total time spent collecting samples (seconds) */
  totalTime?: number;

  /** GC stats from CDP tracing */
  gcStats?: GcStats;

  /** Heap sampling allocation profile (requires --heap-sample) */
  heapProfile?: HeapProfile;
}

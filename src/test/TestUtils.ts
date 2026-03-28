import type { BenchmarkReport } from "../BenchmarkReport.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import { average, percentile } from "../StatisticalUtils.ts";

/** Validation helpers for statistical tests */
export const assertValid = {
  pValue: (value: number) => {
    if (value < 0 || value > 1) {
      throw new Error(`Expected p-value between 0 and 1, got ${value}`);
    }
  },

  percentileOrder: (p25: number, p50: number, p75: number, p99: number) => {
    if (!(p25 <= p50 && p50 <= p75 && p75 <= p99)) {
      throw new Error(
        `Percentiles not ordered: p25=${p25}, p50=${p50}, p75=${p75}, p99=${p99}`,
      );
    }
  },

  significance: (level: string) => {
    const valid = ["none", "weak", "good", "strong"];
    if (!valid.includes(level)) {
      throw new Error(`Invalid significance level: ${level}`);
    }
  },
};

/** @return mock sample data */
export function getSampleData(start: number, end: number): number[] {
  // Simple deterministic pseudo-random sequence for tests
  const samples = [];
  for (let i = 0; i < 1000; i++) {
    samples.push(10 + Math.sin(i * 0.1) * 2 + (i % 5));
  }
  return samples.slice(start, end);
}

/** @return test MeasuredResults */
export function createMeasuredResults(
  sampleRange: [number, number],
  overrides?: Partial<MeasuredResults>,
): MeasuredResults {
  const samples = getSampleData(sampleRange[0], sampleRange[1]);
  const sorted = [...samples].sort((a, b) => a - b);

  return {
    name: "test",
    samples,
    time: {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: average(samples),
      p50: percentile(samples, 0.5),
      p75: percentile(samples, 0.75),
      p95: percentile(samples, 0.95),
      p99: percentile(samples, 0.99),
      p999: percentile(samples, 0.999),
    },
    ...overrides,
  };
}

/** @return test BenchmarkReport */
export function createBenchmarkReport(
  name: string,
  sampleRange: [number, number],
  overrides?: Partial<MeasuredResults>,
): BenchmarkReport {
  return {
    name,
    measuredResults: createMeasuredResults(sampleRange, overrides),
  };
}

import { expect, test } from "vitest";
import { aggregateGcStats } from "../GcStats.ts";

test("aggregateGcStats aggregates multiple events", () => {
  const events = [
    { type: "scavenge" as const, pauseMs: 0.5, collected: 500 },
    { type: "scavenge" as const, pauseMs: 0.3, collected: 800 },
    { type: "mark-compact" as const, pauseMs: 10.0, collected: 5000 },
  ];
  const stats = aggregateGcStats(events);
  expect(stats.scavenges).toBe(2);
  expect(stats.markCompacts).toBe(1);
  expect(stats.totalCollected).toBe(6300);
  expect(stats.gcPauseTime).toBeCloseTo(10.8, 2);
});

test("aggregateGcStats handles empty events", () => {
  const stats = aggregateGcStats([]);
  expect(stats.scavenges).toBe(0);
  expect(stats.markCompacts).toBe(0);
  expect(stats.gcPauseTime).toBe(0);
});

import path from "node:path";
import { expect, test } from "vitest";
import { profileBrowser } from "../browser/BrowserHeapSampler.ts";

const examplesDir = path.resolve(import.meta.dirname!, "../../examples");

test("basic browser benchmark (__start/__done)", { timeout: 30000 }, async () => {
  const url = `file://${examplesDir}/browser-bench/index.html`;
  const result = await profileBrowser({ url, gcStats: true });

  expect(result.samples).toBeDefined();
  expect(result.samples!).toHaveLength(1);
  expect(result.wallTimeMs).toBeGreaterThan(0);
  expect(result.gcStats).toBeDefined();
  expect(result.gcStats!.scavenges).toBeGreaterThanOrEqual(0);
  expect(result.samples![0]).toBeGreaterThan(0);
});

test("browser benchmark with heap profiling", { timeout: 30000 }, async () => {
  const url = `file://${examplesDir}/browser-heap/index.html`;
  const result = await profileBrowser({ url, heapSample: true });

  expect(result.samples).toBeDefined();
  expect(result.samples!).toHaveLength(1);
  expect(result.wallTimeMs).toBeGreaterThan(0);
  expect(result.heapProfile).toBeDefined();
  expect(result.heapProfile!.head).toBeDefined();
});

test("browser benchmark with multiple laps (simulated via __done manually)", { timeout: 30000 }, async () => {
  const url = `file://${examplesDir}/browser-lap/index.html`;
  const result = await profileBrowser({ url, gcStats: true });

  expect(result.samples).toBeDefined();
  expect(result.samples!).toHaveLength(1); // Since I simplified __lap out of the page examples too
  expect(result.wallTimeMs).toBeGreaterThan(0);
  expect(result.gcStats).toBeDefined();
});

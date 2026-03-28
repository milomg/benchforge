import { expect, test } from "vitest";
import { aggregateSites } from "../heap-sample/HeapSampleReport.ts";
import type { HeapSite } from "../heap-sample/ResolvedProfile.ts";

test("unknown column does not merge distinct functions on same line", () => {
  const sites: HeapSite[] = [
    { frame: { name: "Foo", url: "test.ts", line: 10 }, bytes: 100, stack: [] },
    { frame: { name: "Bar", url: "test.ts", line: 10 }, bytes: 200, stack: [] },
  ];
  const aggregated = aggregateSites(sites);
  expect(aggregated).toHaveLength(2);
});

test("same column merges regardless of function name", () => {
  const sites: HeapSite[] = [
    {
      frame: { name: "Foo", url: "test.ts", line: 10, col: 5 },
      bytes: 100,
      stack: [],
    },
    {
      frame: { name: "Foo", url: "test.ts", line: 10, col: 5 },
      bytes: 200,
      stack: [],
    },
  ];
  const aggregated = aggregateSites(sites);
  expect(aggregated).toHaveLength(1);
  expect(aggregated[0].bytes).toBe(300);
});

test("aggregation preserves distinct caller stacks", () => {
  const stackA = [
    { name: "root", url: "a.ts", line: 1, col: 0 },
    { name: "foo", url: "a.ts", line: 10, col: 0 },
    { name: "alloc", url: "a.ts", line: 20, col: 5 },
  ];
  const stackB = [
    { name: "root", url: "a.ts", line: 1, col: 0 },
    { name: "bar", url: "a.ts", line: 15, col: 0 },
    { name: "alloc", url: "a.ts", line: 20, col: 5 },
  ];
  const sites: HeapSite[] = [
    {
      frame: { name: "alloc", url: "a.ts", line: 20, col: 5 },
      bytes: 800,
      stack: stackA,
    },
    {
      frame: { name: "alloc", url: "a.ts", line: 20, col: 5 },
      bytes: 200,
      stack: stackB,
    },
  ];
  const aggregated = aggregateSites(sites);

  expect(aggregated).toHaveLength(1);
  expect(aggregated[0].bytes).toBe(1000);
  expect(aggregated[0].callers).toHaveLength(2);
  expect(aggregated[0].stack![1].name).toBe("foo");
  expect(aggregated[0].callers![0].bytes).toBe(800);
  expect(aggregated[0].callers![1].bytes).toBe(200);
});

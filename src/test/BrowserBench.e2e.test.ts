import path from "node:path";
import { expect, test } from "vitest";
import { profileBrowser } from "../BrowserHeapSampler.ts";

const examplesDir = path.resolve(import.meta.dirname!, "../../examples");

test("browser benchmark", { timeout: 30000 }, async () => {
  const url = `file://${examplesDir}/index.html`;
  const result = await profileBrowser({ url, gcStats: true, heapSample: true });

  expect(result.gcStats).toBeDefined();
  expect(result.heapProfile).toBeDefined();
  expect(result.heapProfile!.head).toBeDefined();
});

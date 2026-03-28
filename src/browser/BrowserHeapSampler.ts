import {
  type BrowserServer,
  type CDPSession,
  chromium,
  type Page,
} from "playwright";
import type { GcStats } from "../GcStats.ts";
import type {
  HeapProfile,
  HeapSampleOptions,
} from "../heap-sample/HeapSampler.ts";
import { browserGcStats, type TraceEvent } from "./BrowserGcStats.ts";

export interface BrowserProfileParams {
  url: string;
  heapSample?: boolean;
  heapOptions?: HeapSampleOptions;
  gcStats?: boolean;
  headless?: boolean;
  chromeArgs?: string[];
  timeout?: number; // seconds
}

export interface BrowserProfileResult {
  heapProfile?: HeapProfile;
  gcStats?: GcStats;
  /** Wall-clock ms (lap mode: first start to done, bench function: total loop) */
  wallTimeMs?: number;
  /** Per-iteration timing samples (ms) from bench function or lap mode */
  samples?: number[];
}

interface ManualModeHandle {
  promise: Promise<BrowserProfileResult>;
  cancel: () => void;
}

/** Run browser benchmark via manual timing hooks.
 *  Page calls __start() to begin instruments and __done() to collect results. */
export async function profileBrowser(
  params: BrowserProfileParams,
): Promise<BrowserProfileResult> {
  const { url, headless = true, chromeArgs, timeout = 60 } = params;
  const { gcStats: collectGc } = params;
  const { samplingInterval = 32768 } = params.heapOptions ?? {};

  const server = await chromium.launchServer({ headless, args: chromeArgs });
  pipeChromeOutput(server);
  const browser = await chromium.connect(server.wsEndpoint());
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeout * 1000);
    const cdp = await page.context().newCDPSession(page);

    const pageErrors: string[] = [];
    page.on("pageerror", err => pageErrors.push(err.message));

    const traceEvents = collectGc ? await startGcTracing(cdp) : [];
    const manualMode = await setupManualMode(
      page,
      cdp,
      params,
      samplingInterval,
      timeout,
      pageErrors,
    );

    await page.goto(url, { waitUntil: "load" });

    let result = await manualMode.promise;
    manualMode.cancel();

    if (collectGc) {
      result = { ...result, gcStats: await collectTracing(cdp, traceEvents) };
    }
    return result;
  } finally {
    await browser.close();
    await server.close();
  }
}

/** Forward Chrome's stdout/stderr to the terminal so V8 flag output is visible. */
function pipeChromeOutput(server: BrowserServer): void {
  const proc = server.process();
  const pipe = (stream: NodeJS.ReadableStream | null) =>
    stream?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        const text = line.trim();
        if (text) process.stderr.write(`[chrome] ${text}\n`);
      }
    });
  pipe(proc.stdout);
  pipe(proc.stderr);
}

/** Start CDP GC tracing, returns the event collector array. */
async function startGcTracing(cdp: CDPSession): Promise<TraceEvent[]> {
  const events: TraceEvent[] = [];
  cdp.on("Tracing.dataCollected", ({ value }) => {
    for (const e of value) events.push(e as unknown as TraceEvent);
  });
  await cdp.send("Tracing.start", {
    traceConfig: { includedCategories: ["v8", "v8.gc"] },
  });
  return events;
}

/** Stop CDP tracing and aggregate collected events into GcStats. */
async function collectTracing(
  cdp: CDPSession,
  traceEvents: TraceEvent[],
): Promise<GcStats> {
  const complete = new Promise<void>(resolve => {
    cdp.once("Tracing.tracingComplete", () => resolve());
  });
  await cdp.send("Tracing.end");
  await complete;
  return browserGcStats(traceEvents);
}

/** Inject __start as in-page function, expose __done for results collection.
 *  First __start() triggers instrument start. __done() stops instruments and collects timing data. */
async function setupManualMode(
  page: Page,
  cdp: CDPSession,
  params: BrowserProfileParams,
  samplingInterval: number,
  timeout: number,
  pageErrors: string[],
): Promise<ManualModeHandle> {
  const { heapSample } = params;
  const { promise, resolve, reject } =
    Promise.withResolvers<BrowserProfileResult>();
  let instrumentsStarted = false;

  await page.exposeFunction("__benchInstrumentStart", async () => {
    if (instrumentsStarted) return;
    instrumentsStarted = true;
    if (heapSample) {
      await cdp.send("HeapProfiler.startSampling", { samplingInterval });
    }
  });

  await page.exposeFunction(
    "__benchCollect",
    async (samples: number[], wallTimeMs: number) => {
      let heapProfile: HeapProfile | undefined;
      if (heapSample && instrumentsStarted) {
        const result = await cdp.send("HeapProfiler.stopSampling");
        heapProfile = result.profile as unknown as HeapProfile;
      }
      resolve({ samples, heapProfile, wallTimeMs });
    },
  );

  await page.addInitScript(injectManualFunctions);

  const timer = setTimeout(() => {
    const lines = [`Timed out after ${timeout}s`];
    if (pageErrors.length) {
      lines.push("Page JS errors:", ...pageErrors.map(e => `  ${e}`));
    } else {
      lines.push("Page did not call __done()");
    }
    reject(new Error(lines.join("\n")));
  }, timeout * 1000);

  return { promise, cancel: () => clearTimeout(timer) };
}

/** In-page timing functions injected via addInitScript (zero CDP overhead).
 *  __start marks the beginning, __done marks the end and collects results. */
function injectManualFunctions(): void {
  const g = globalThis as any;
  let startTime = 0;

  g.__start = () => {
    startTime = performance.now();
    return g.__benchInstrumentStart();
  };

  g.__done = () => {
    const wallTimeMs = performance.now() - startTime;
    return g.__benchCollect([wallTimeMs], wallTimeMs);
  };
}

export { profileBrowser as profileBrowserHeap };

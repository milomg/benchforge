/** GC statistics aggregated from V8 trace events. */
export interface GcStats {
  scavenges: number;
  markCompacts: number;
  totalCollected: number; // bytes freed
  gcPauseTime: number; // total pause time (ms)
}

/** Single GC event from browser CDP tracing. */
export interface GcEvent {
  type: "scavenge" | "mark-compact" | "minor-ms" | "unknown";
  pauseMs: number;
  collected: number;
}

/** Aggregate GC events into summary stats */
export function aggregateGcStats(events: GcEvent[]): GcStats {
  let scavenges = 0;
  let markCompacts = 0;
  let gcPauseTime = 0;
  let totalCollected = 0;

  for (const e of events) {
    if (e.type === "scavenge" || e.type === "minor-ms") scavenges++;
    else if (e.type === "mark-compact") markCompacts++;
    gcPauseTime += e.pauseMs;
    totalCollected += e.collected;
  }

  return { scavenges, markCompacts, totalCollected, gcPauseTime };
}

// --- CDP browser GC tracing ---

/** CDP trace event from Tracing.dataCollected */
export interface TraceEvent {
  cat: string;
  name: string;
  ph: string;
  dur?: number; // microseconds
  args?: Record<string, any>;
}

/** Parse CDP trace events (MinorGC/MajorGC) into GcEvent[] */
export function parseGcTraceEvents(traceEvents: TraceEvent[]): GcEvent[] {
  return traceEvents.flatMap(e => {
    if (e.ph !== "X") return [];
    const type = cdpGcType(e.name);
    if (!type) return [];
    const durUs = e.dur ?? 0;
    const heapBefore: number = e.args?.usedHeapSizeBefore ?? 0;
    const heapAfter: number = e.args?.usedHeapSizeAfter ?? 0;
    return [
      {
        type,
        pauseMs: durUs / 1000,
        collected: Math.max(0, heapBefore - heapAfter),
      },
    ];
  });
}

/** Parse CDP trace events and aggregate into GcStats */
export function browserGcStats(traceEvents: TraceEvent[]): GcStats {
  return aggregateGcStats(parseGcTraceEvents(traceEvents));
}

function cdpGcType(name: string): GcEvent["type"] | undefined {
  if (name === "MinorGC") return "scavenge";
  if (name === "MajorGC") return "mark-compact";
  return undefined;
}

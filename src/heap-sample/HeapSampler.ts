export interface HeapSampleOptions {
  /** Bytes between samples (default 32768) */
  samplingInterval?: number;

  /** Max stack frames (default 64) */
  stackDepth?: number;

  /** Keep objects collected by minor GC (default true) */
  includeMinorGC?: boolean;

  /** Keep objects collected by major GC (default true) */
  includeMajorGC?: boolean;
}

/** V8 call frame location within a profiled script */
export interface CallFrame {
  /** Function name (empty string for anonymous) */
  functionName: string;

  /** Script URL or file path */
  url: string;

  /** Zero-based line number */
  lineNumber: number;

  /** Zero-based column number */
  columnNumber?: number;
}

/** Node in the V8 sampling heap profile tree */
export interface ProfileNode {
  /** Call site for this allocation node */
  callFrame: CallFrame;

  /** Bytes allocated directly at this node (not children) */
  selfSize: number;

  /** Unique node ID, links to {@link HeapSample.nodeId} */
  id: number;

  /** Child nodes in the call tree */
  children?: ProfileNode[];
}

/** Individual heap allocation sample from V8's SamplingHeapProfiler */
export interface HeapSample {
  /** Links to {@link ProfileNode.id} for stack lookup */
  nodeId: number;

  /** Allocation size in bytes */
  size: number;

  /** Monotonically increasing, gives temporal ordering */
  ordinal: number;
}

/** V8 sampling heap profile tree with optional per-allocation samples */
export interface HeapProfile {
  /** Root of the profile call tree */
  head: ProfileNode;

  /** Per-allocation samples, if collected */
  samples?: HeapSample[];
}

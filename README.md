# Benchforge (Browser-Only)

Benchforge captures GC impact and heap allocations in the browser.

Traditional benchmarking tools either ignore GC or try to avoid it.
Benchforge captures GC impact via CDP (Chrome DevTools Protocol) tracing.

- **Heap allocation profiling** — attribute allocations to call sites, including short-lived objects already collected by GC.
- **GC-aware statistics** — bootstrap confidence intervals that account for GC variance.
- **GC collection reports** — collected bytes, scavenge/full GC counts, and pause times.

## Installation

```bash
npm install benchforge
# or
pnpm add benchforge
```

## Quick Start

Benchforge now only supports browser-based benchmarking via Playwright.
Your page controls when measurement begins and ends using `__start()` and `__done()`.

```html
<!-- index.html -->
<script>
async function run() {
  await __start();          // Start instruments and timing
  
  // Do work to be measured
  for (let i = 0; i < 1000; i++) {
    const arr = Array.from({ length: 100 }, () => Math.random());
    arr.sort();
  }
  
  await __done();           // Stop instruments, collect results
}
run();
</script>
```

Run the benchmark:

```bash
benchforge --url http://localhost:5173 --gc-stats --heap-sample
```

## How It Works

1.  **Launch**: Benchforge launches a Chromium instance via Playwright.
2.  **Instrument**: It connects via CDP and injects `__start` and `__done` functions.
3.  **Navigate**: It navigates to your provided `--url`.
4.  **Measure**: 
    *   `__start()` resets the timing origin and starts heap sampling (if enabled).
    *   `__done()` stops all instruments and sends the timing/profile data back to the CLI.
5.  **Report**: Benchforge processes the results and prints a summary table or exports reports.

## CLI Options

- `--url <url>` - **Required**. Page URL for browser profiling.
- `--gc-stats` - Collect GC statistics via CDP tracing.
- `--heap-sample` - Enable heap sampling allocation attribution.
- `--view-report` - Open HTML report in browser after run.
- `--export-report <file>` - Export HTML report to file.
- `--export-json <file>` - Export benchmark data to JSON.
- `--view-alloc` - Open allocation profile in viewer (speedscope).
- `--headless` / `--no-headless` - Run browser in headless mode (default: true).

## Requirements

- Node.js 22.6+ (for orchestration)
- Playwright (Chromium)

## Interpreting Results

Results are displayed in a formatted table:

```
╔════════════╤══════════════════╤══════╗
║            │       time       │      ║
║ name       │ mean  p50   p99  │ runs ║
╟────────────┼──────────────────┼──────╢
║ index.html │ 2.49  2.50  2.90 │ 1    ║
╚════════════╧══════════════════╧══════╝
```

- **mean**: Average time between `__start()` and `__done()`.
- **p50/p99**: Percentiles (only relevant if multiple samples are collected, though current `__start`/`__done` implementation records a single sample).

### Heap Allocation Profiling

Use `--heap-sample` and `--view-alloc` to see exactly where memory is being allocated:

```bash
benchforge --url http://localhost:5173 --heap-sample --view-alloc
```

This opens a flame chart showing allocation sites weighted by total bytes allocated (including garbage).

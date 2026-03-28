/** Format bytes with appropriate units (B, KB, MB, GB).
 *  Use `space: true` for human-readable console output (`1.5 KB`). */
export function formatBytes(
  bytes: unknown,
  opts?: { space?: boolean },
): string | null {
  if (typeof bytes !== "number") return null;
  const s = opts?.space ? " " : "";
  if (bytes < 1024) return `${bytes.toFixed(0)}${s}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}${s}KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)}${s}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}${s}GB`;
}

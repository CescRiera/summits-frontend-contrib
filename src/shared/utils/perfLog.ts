const tag = "[Perf]";
const startTime = performance.now();

function mem() {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!m) return null;
  return {
    usedMB: +(m.usedJSHeapSize / 1048576).toFixed(1),
    limitMB: +(m.jsHeapSizeLimit / 1048576).toFixed(1),
  };
}

export function perfMark(label: string) {
  const elapsed = +(performance.now() - startTime).toFixed(0);
  const m = mem();
  const memStr = m ? ` | heap: ${m.usedMB}MB / ${m.limitMB}MB` : "";
  console.log(`${tag} ${elapsed}ms ${label}${memStr}`);
}

export function perfMarkAsync(label: string, fn: () => Promise<unknown>) {
  return async () => {
    const t0 = performance.now();
    perfMark(`${label} start`);
    try {
      const result = await fn();
      perfMark(`${label} done (${+(performance.now() - t0).toFixed(0)}ms)`);
      return result;
    } catch (e) {
      perfMark(`${label} FAILED (${+(performance.now() - t0).toFixed(0)}ms)`);
      throw e;
    }
  };
}

export function perfMeasurePhase(label: string, fn: () => void) {
  const t0 = performance.now();
  fn();
  const elapsed = +(performance.now() - t0).toFixed(0);
  const m = mem();
  const memStr = m ? ` | heap: ${m.usedMB}MB` : "";
  console.log(`${tag} ${label} took ${elapsed}ms${memStr}`);
}

export function perfMemorySnapshot(label: string) {
  const m = mem();
  if (!m) return;
  console.log(`${tag} MEMORY [${label}]: ${m.usedMB}MB used / ${m.limitMB}MB limit`);

  if (typeof navigator !== "undefined" && "connection" in navigator) {
    const conn = (navigator as { connection?: { effectiveType?: string; downlink?: number } }).connection;
    if (conn) {
      console.log(`${tag} NETWORK: effectiveType=${conn.effectiveType}, downlink=${conn.downlink}Mbps`);
    }
  }
}

/**
 * Opt-in performance overlay for profiling on real devices: add ?perf to any page URL.
 * Shows frame rate and the worst frame over the last second, the time from a tap to the map
 * settling ("nav"), and download sizes/times of the data files. Nothing runs without ?perf.
 */
export interface PerfProbe {
  navigationStarted(): void;
  attach(map: google.maps.Map): void;
}

export function createPerfProbe(): PerfProbe | null {
  if (!new URLSearchParams(location.search).has("perf")) return null;

  const box = document.createElement("pre");
  box.setAttribute("aria-hidden", "true");
  box.style.cssText =
    "position:fixed;top:68px;left:16px;z-index:20;margin:0;padding:8px 10px;border-radius:6px;" +
    "background:rgb(30 20 8/.85);color:#f1e8d7;font:11px/1.45 ui-monospace,monospace;pointer-events:none;white-space:pre";
  document.body.append(box);

  let frames = 0;
  let worst = 0;
  let last = performance.now();
  let fps = 0;
  let worstShown = 0;
  let navStart: number | null = null;
  let navMs: number[] = [];
  const files: string[] = [];

  const loop = (t: number) => {
    frames++;
    worst = Math.max(worst, t - last);
    last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as PerformanceResourceTiming[]) {
      if (!e.name.includes("/data/")) continue;
      const name = e.name.split("/data/")[1] ?? e.name;
      files.unshift(`${name}  ${Math.round(e.duration)}ms  ${(e.encodedBodySize / 1024).toFixed(0)}KB`);
      files.length = Math.min(files.length, 4);
    }
  }).observe({ type: "resource", buffered: true });

  setInterval(() => {
    fps = frames;
    worstShown = Math.round(worst);
    frames = 0;
    worst = 0;
    const nav = navMs.length
      ? `${navMs[0]}ms (avg ${Math.round(navMs.reduce((a, b) => a + b, 0) / navMs.length)})`
      : "–";
    box.textContent = [`fps   ${fps}`, `worst ${worstShown}ms`, `nav   ${nav}`, ...files].join("\n");
  }, 1000);

  return {
    navigationStarted() {
      navStart = performance.now();
    },
    attach(map) {
      map.addListener("idle", () => {
        if (navStart === null) return;
        navMs = [Math.round(performance.now() - navStart), ...navMs].slice(0, 10);
        navStart = null;
      });
    },
  };
}

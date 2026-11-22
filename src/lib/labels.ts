/**
 * Greedy label placement in screen space. Candidates are tried in priority order; a label is
 * shown only if it fits inside its region's on-screen width and doesn't overlap an already
 * placed label (plus padding).
 */
export interface LabelCandidate {
  id: string;
  /** Anchor (label centre) in screen pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** On-screen width of the region's bounding box; labels wider than this are hidden. */
  regionWidth: number;
  /** Higher goes first (e.g. selected region, then larger regions). */
  priority: number;
}

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Labels can be this much wider than their region's bbox (bboxes understate irregular shapes). */
const WIDTH_SLACK = 1.15;

export function placeLabels(candidates: LabelCandidate[], padding = 4): Set<string> {
  const placed: Box[] = [];
  const visible = new Set<string>();
  const ordered = [...candidates].sort((a, b) => b.priority - a.priority);
  for (const c of ordered) {
    if (c.width > c.regionWidth * WIDTH_SLACK) continue;
    const box: Box = {
      l: c.x - c.width / 2 - padding,
      t: c.y - c.height / 2 - padding,
      r: c.x + c.width / 2 + padding,
      b: c.y + c.height / 2 + padding,
    };
    if (placed.some((p) => box.l < p.r && box.r > p.l && box.t < p.b && box.b > p.t)) continue;
    placed.push(box);
    visible.add(c.id);
  }
  return visible;
}

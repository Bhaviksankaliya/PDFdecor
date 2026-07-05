import { PdfOperationError } from "./errors.js";

/**
 * Parse a 1-based page range spec like "1-3, 5, 8-" into sorted, unique,
 * 0-based page indices, clamped to [0, total).
 *
 *   "1-3,5"   -> [0,1,2,4]
 *   "8-"      -> [7,8,...,total-1]
 *   "-3"      -> [0,1,2]
 */
export function parsePageSpec(spec: string, total: number): number[] {
  const out = new Set<number>();
  const parts = spec
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new PdfOperationError("EMPTY_SPEC", "No pages were specified.");
  }

  for (const part of parts) {
    const m = part.match(/^(\d+)?\s*-\s*(\d+)?$/);
    if (m) {
      const start = m[1] ? Number(m[1]) : 1;
      const end = m[2] ? Number(m[2]) : total;
      if (start < 1 || end < 1 || start > end) {
        throw new PdfOperationError("BAD_RANGE", `Invalid page range: "${part}".`);
      }
      for (let i = start; i <= end && i <= total; i++) out.add(i - 1);
    } else if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n < 1 || n > total) {
        throw new PdfOperationError(
          "PAGE_OUT_OF_RANGE",
          `Page ${n} is outside 1–${total}.`,
        );
      }
      out.add(n - 1);
    } else {
      throw new PdfOperationError("BAD_SPEC", `Could not parse "${part}".`);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** Normalize a rotation to one of 0/90/180/270. */
export function normalizeAngle(angle: number): 0 | 90 | 180 | 270 {
  const a = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  return a as 0 | 90 | 180 | 270;
}

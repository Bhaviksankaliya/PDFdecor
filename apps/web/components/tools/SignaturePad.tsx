"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { extractInk, trimTransparent } from "@/lib/overlay";

/** Checkerboard backdrop so transparency is visible in previews. */
const CHECKER: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%),linear-gradient(45deg,#e2e8f0 25%,transparent 25%,transparent 75%,#e2e8f0 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
};

export type SignatureResult = { url: string; w: number; h: number };

type Tab = "draw" | "type" | "upload";

const INK = [
  { label: "Black", value: "#111111" },
  { label: "Blue", value: "#1d4ed8" },
];

const SCRIPT_FONTS = ["Great Vibes", "Dancing Script", "Pacifico", "Sacramento"];

// Load the handwriting fonts once so the "Type" tab can render them to canvas.
function useSignatureFonts() {
  useEffect(() => {
    const id = "sig-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&family=Sacramento&display=swap";
    document.head.appendChild(link);
  }, []);
}

export function SignaturePad({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (sig: SignatureResult) => void;
}) {
  useSignatureFonts();
  const [tab, setTab] = useState<Tab>("draw");
  const [ink, setInk] = useState(INK[0]!.value);
  const [busy, setBusy] = useState(false);

  // Draw
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Type
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState(SCRIPT_FONTS[0]!);

  // Upload
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Recompute the ink extraction whenever the image or the toggle changes.
  useEffect(() => {
    if (!uploadUrl || !removeBg) {
      setExtractedUrl(null);
      return;
    }
    let cancelled = false;
    setExtracting(true);
    extractInk(uploadUrl)
      .then((url) => {
        if (!cancelled) setExtractedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setExtractedUrl(null);
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uploadUrl, removeBg]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current!.getContext("2d")!;
    drawing.current = true;
    dirty.current = true;
    setHasInk(true);
    const p = pointerPos(e);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pointerPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function endDraw() {
    drawing.current = false;
  }
  function clearDraw() {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    setHasInk(false);
  }

  function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function produce() {
    setBusy(true);
    try {
      if (tab === "draw") {
        const c = canvasRef.current!;
        const trimmed = await trimTransparent(c.toDataURL("image/png"));
        onDone(trimmed);
      } else if (tab === "type") {
        if (!typed.trim()) return;
        await document.fonts.load(`64px "${font}"`, typed).catch(() => {});
        const scale = 4;
        const fontPx = 64 * scale;
        const measure = document.createElement("canvas").getContext("2d")!;
        measure.font = `${fontPx}px "${font}"`;
        const w = Math.ceil(measure.measureText(typed).width) + fontPx;
        const h = Math.ceil(fontPx * 1.6);
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d")!;
        ctx.font = `${fontPx}px "${font}"`;
        ctx.fillStyle = ink;
        ctx.textBaseline = "middle";
        ctx.fillText(typed, fontPx / 2, h / 2);
        onDone(await trimTransparent(cv.toDataURL("image/png")));
      } else {
        if (!uploadUrl) return;
        const prepped = removeBg
          ? extractedUrl ?? (await extractInk(uploadUrl))
          : uploadUrl;
        onDone(await trimTransparent(prepped));
      }
    } finally {
      setBusy(false);
    }
  }

  const canUse =
    (tab === "draw" && hasInk) ||
    (tab === "type" && typed.trim().length > 0) ||
    (tab === "upload" && !!uploadUrl);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-card-hover">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Create your signature</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {(["draw", "type", "upload"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-md py-1.5 font-medium capitalize transition",
                tab === t ? "bg-white text-brand-600 shadow-sm" : "text-slate-500",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Ink color (draw + type) */}
        {tab !== "upload" && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-slate-500">Ink:</span>
            {INK.map((c) => (
              <button
                key={c.value}
                onClick={() => setInk(c.value)}
                aria-label={c.label}
                className={cn(
                  "h-6 w-6 rounded-full border-2",
                  ink === c.value ? "border-brand-500" : "border-transparent",
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        )}

        <div className="mt-3">
          {tab === "draw" && (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className="w-full touch-none rounded-xl border border-slate-200 bg-[repeating-linear-gradient(0deg,transparent,transparent_39px,#eef2f7_39px,#eef2f7_40px)]"
                style={{ cursor: "crosshair" }}
              />
              <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-xs text-slate-300">
                Draw your signature above
              </div>
              <button
                onClick={clearDraw}
                className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/80 px-2 py-1 text-xs text-slate-500 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          )}

          {tab === "type" && (
            <div className="space-y-3">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type your name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <div className="grid grid-cols-2 gap-2">
                {SCRIPT_FONTS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFont(f)}
                    className={cn(
                      "flex h-16 items-center justify-center overflow-hidden rounded-lg border px-2 transition",
                      font === f ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50",
                    )}
                    style={{ fontFamily: `"${f}", cursive`, color: ink }}
                  >
                    <span className="truncate text-2xl">{typed.trim() || "Signature"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3">
              {uploadUrl ? (
                <div
                  className="relative grid place-items-center rounded-xl border border-slate-200 p-4"
                  style={removeBg ? CHECKER : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={removeBg ? extractedUrl ?? uploadUrl : uploadUrl}
                    alt="Signature preview"
                    className={cn("max-h-32", extracting && "opacity-40")}
                  />
                  {extracting && (
                    <div className="absolute inset-0 grid place-items-center">
                      <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                    </div>
                  )}
                  <button
                    onClick={() => setUploadUrl(null)}
                    className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-500 hover:text-red-500"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-500 hover:border-brand-300">
                  <Upload className="h-6 w-6 text-brand-500" />
                  Upload a signature image (PNG or JPG)
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onUploadFile} />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                />
                Keep ink only — remove background, paper tint & shadows
              </label>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={produce}
            disabled={!canUse || busy}
            className="btn-brand flex-1"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Use signature"}
          </button>
        </div>
      </div>
    </div>
  );
}

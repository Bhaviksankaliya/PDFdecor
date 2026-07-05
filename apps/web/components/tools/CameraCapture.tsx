"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Capture a still from the device camera and return it as a JPEG File. */
export function CameraCapture({
  onCapture,
  compact = false,
}: {
  onCapture: (file: File) => void;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setOpen(true);
      // Attach after the element mounts.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("Could not access the camera. Check browser permissions.");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOpen(false);
  }

  function shoot() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // The frame is copied to the canvas synchronously here, so it's safe to
    // turn the camera off immediately after.
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" }));
        }
      },
      "image/jpeg",
      0.92,
    );
    // Turn off the camera and close the capture view after a shot.
    stop();
  }

  return (
    <>
      <button
        onClick={start}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 font-medium text-slate-500 hover:border-brand-300",
          compact ? "px-4 py-3 text-sm" : "w-full px-4 py-4",
        )}
      >
        <Camera className="h-5 w-5" />
        {compact ? "Camera" : "Capture from camera"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between pb-3">
              <h3 className="font-semibold">Camera</h3>
              <button onClick={stop} aria-label="Close camera">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted />
            <div className="mt-4 flex gap-3">
              <button onClick={shoot} className="btn-brand flex-1">
                <Camera className="h-5 w-5" /> Capture
              </button>
              <button
                onClick={stop}
                className="rounded-xl border border-slate-200 px-5 py-3 font-medium text-slate-600 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

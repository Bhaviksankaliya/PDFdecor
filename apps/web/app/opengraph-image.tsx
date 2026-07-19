import { ImageResponse } from "next/og";

// Edge runtime: @vercel/og's node build crashes on Windows paths at
// build-time prerender; edge compiles without executing and Vercel serves
// it as an edge function.
export const runtime = "edge";

export const alt =
  "PDFdecor — Free Online PDF Editor & Tools: merge, split, compress, convert, sign";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1b2437 0%, #0f1523 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "linear-gradient(135deg, #f5623b, #e23c17)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ color: "white", fontSize: 64, fontWeight: 800 }}>
            PDFdecor
          </div>
        </div>
        <div
          style={{
            color: "white",
            fontSize: 44,
            fontWeight: 700,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Free Online PDF Editor &amp; Tools
        </div>
        <div
          style={{
            color: "#f5a88f",
            fontSize: 30,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Merge · Split · Compress · Convert · Edit · Sign — no sign-up
        </div>
      </div>
    ),
    size,
  );
}

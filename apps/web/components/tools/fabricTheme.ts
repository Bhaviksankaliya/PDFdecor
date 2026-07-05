"use client";

import { InteractiveFabricObject, type FabricObject } from "fabric";

const BRAND = "#f5482c";

let installed = false;

/**
 * Restyle Fabric's default selection chrome (thin blue hairlines + hollow
 * square handles) into a modern look: solid brand border, white circular
 * handles with a brand ring, and comfortable touch targets. Applies to every
 * object created after install — call once before any object exists.
 */
export function installSelectionTheme(): void {
  if (installed) return;
  installed = true;
  InteractiveFabricObject.ownDefaults = {
    ...InteractiveFabricObject.ownDefaults,
    transparentCorners: false,
    cornerStyle: "circle",
    cornerColor: "#ffffff",
    cornerStrokeColor: BRAND,
    cornerSize: 10,
    touchCornerSize: 24,
    borderColor: BRAND,
    borderScaleFactor: 1.6,
    borderOpacityWhenMoving: 0.35,
    padding: 4,
    // Magnetic rotation: free rotation, but snap onto 0/45/90/… when within
    // a few degrees — makes exact horizontal/vertical easy to hit.
    snapAngle: 45,
    snapThreshold: 3,
  };
}

/** Draw the rotation handle as a white disc with a circular-arrow glyph. */
function renderRotateHandle(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _style: unknown,
  fabricObject: FabricObject,
): void {
  const size = 24;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(((fabricObject.angle ?? 0) * Math.PI) / 180);

  // White disc with a soft shadow and hairline ring.
  ctx.shadowColor = "rgba(15,23,42,0.25)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(15,23,42,0.15)";
  ctx.stroke();

  // Circular-arrow glyph: an almost-full arc with an arrowhead at its end.
  const r = 4.5;
  const gap = 1.1;
  const start = -Math.PI / 2 + gap;
  const end = -Math.PI / 2 - gap + Math.PI * 2;
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(0, 0, r, start, end);
  ctx.stroke();
  // Arrowhead at the arc's end, pointing along the (clockwise) tangent.
  ctx.translate(Math.cos(end) * r, Math.sin(end) * r);
  ctx.rotate(end + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(-2.6, -1.2);
  ctx.lineTo(0.6, 0);
  ctx.lineTo(-2.6, 1.2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Give an object's rotation (mtr) control the custom glyph. Controls are
 * per-instance in Fabric v6, so this runs for every created object (wired to
 * the canvas `object:added` event and on selection for ActiveSelection).
 */
export function styleRotationControl(obj: FabricObject | undefined): void {
  const mtr = obj?.controls?.mtr;
  if (!mtr) return;
  mtr.render = renderRotateHandle;
  mtr.sizeX = 24;
  mtr.sizeY = 24;
  mtr.offsetY = -32;
  mtr.withConnection = true;
  // Hand cursor on hover (the default handler shows a crosshair).
  mtr.cursorStyleHandler = () => "grab";
}

/* Ambient page backdrop: circuit traces in the side gutters, data pulses that
   run along them, and nodes that light up near the pointer. The canvases sit
   behind the content and never takes pointer events, so the glow only shows
   on the background. The traces are drawn once per resize onto their own
   canvas; the motion canvas above it only erases and repaints the small areas
   the pulses and the glow cover. Clearing and re-blitting the whole screen each
   frame costs a full frame budget where 2D canvas runs on the CPU, as it often
   does in Firefox. Reduced motion or the pause toggle leave the static traces
   and stop the loop. */

import { useEffect, useRef, useState } from "react";
import { Icons } from "./icons";
import { useMediaQuery } from "./useMediaQuery";
import { useTranslation } from "../i18n";
import "./CircuitBackdrop.css";

interface Point {
  x: number;
  y: number;
}

interface Trace {
  points: Point[];
  lengths: number[];
  total: number;
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Pulse {
  trace: Trace;
  distance: number;
  speed: number;
}

const DEFAULT_CONTENT_WIDTH = 1180;
const MIN_GUTTER = 72;
const TRACE_SPACING = 64;
const PULSE_TAIL = 42;
const MAX_PULSES = 10;
const PULSE_INTERVAL_MS = 520;
const POINTER_RADIUS = 120;
const PAUSED_KEY = "aegis.backdropPaused";
/* Firefox's CPU canvas pays per frame in proportion to the canvas's pixels, so
   the soft moving dots render at 1x even on high-density screens. */
const MOTION_PIXEL_RATIO = 1;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function measure(points: Point[]): Trace {
  const lengths = points
    .slice(1)
    .map((point, index) => Math.hypot(point.x - points[index]!.x, point.y - points[index]!.y));
  return { points, lengths, total: lengths.reduce((sum, length) => sum + length, 0) };
}

function pointAt(trace: Trace, distance: number): Point {
  let remaining = Math.max(0, Math.min(distance, trace.total));
  for (let index = 0; index < trace.lengths.length; index += 1) {
    const length = trace.lengths[index]!;
    if (remaining <= length) {
      const from = trace.points[index]!;
      const to = trace.points[index + 1]!;
      const ratio = length === 0 ? 0 : remaining / length;
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
    remaining -= length;
  }
  return trace.points[trace.points.length - 1]!;
}

/* Each trace leaves the screen edge and wanders toward the content column in
   horizontal runs joined by 45-degree bends, like a PCB route. */
function buildTraces(width: number, height: number, contentWidth: number): Trace[] {
  const random = seededRandom(Math.round(width) * 31 + Math.round(height));
  const gutter = (width - contentWidth) / 2;
  const reach = gutter >= MIN_GUTTER ? gutter - 16 : width * 0.18;
  const traces: Trace[] = [];
  for (const side of [-1, 1] as const) {
    const edge = side === -1 ? 0 : width;
    for (let y = 40 + random() * 30; y < height; y += TRACE_SPACING + random() * 40) {
      const points: Point[] = [{ x: edge, y }];
      let x = edge;
      let currentY = y;
      const runs = 2 + Math.floor(random() * 3);
      for (let run = 0; run < runs; run += 1) {
        const step = (reach / runs) * (0.6 + random() * 0.6);
        x -= side * step;
        points.push({ x, y: currentY });
        if (run < runs - 1) {
          const bend = (random() < 0.5 ? -1 : 1) * (10 + random() * 26);
          x -= side * Math.abs(bend);
          currentY += bend;
          points.push({ x, y: currentY });
        }
      }
      traces.push(measure(points));
    }
  }
  return traces;
}

function sizeCanvas(canvas: HTMLCanvasElement, width: number, height: number, pixelRatio: number): void {
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function padded({ left, top, right, bottom }: Bounds, padding: number): Bounds {
  return { left: left - padding, top: top - padding, right: right + padding, bottom: bottom + padding };
}

function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    trace: token("--ds-border-strong", "#aeb5c0"),
    pulse: token("--ds-accent", "#075ff7"),
    node: token("--ds-card-rim-ready", "#0891b2"),
  };
}

function readPaused(): boolean {
  try {
    return localStorage.getItem(PAUSED_KEY) === "true";
  } catch {
    return false;
  }
}

function savePaused(paused: boolean): void {
  try {
    localStorage.setItem(PAUSED_KEY, String(paused));
  } catch {
    // Remembering the choice is a convenience; the toggle still applies now.
  }
}

export function CircuitBackdrop({
  contentWidth = DEFAULT_CONTENT_WIDTH,
}: {
  /** Width of the centered content column; traces stay in the gutters beside it. */
  contentWidth?: number;
}) {
  const { t } = useTranslation();
  const traceCanvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(readPaused);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const traceCanvas = traceCanvasRef.current;
    const motionCanvas = motionCanvasRef.current;
    const traceContext = traceCanvas?.getContext("2d");
    const context = motionCanvas?.getContext("2d");
    if (!traceCanvas || !motionCanvas || !traceContext || !context) return;

    let palette = readPalette();
    let traces: Trace[] = [];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const pulses: Pulse[] = [];
    const pointer = { x: -9999, y: -9999 };
    let frame = 0;
    let lastSpawn = 0;
    let lastTime = 0;
    let painted: Bounds[] = [];

    const paint = (bounds: Bounds) => painted.push(bounds);

    const erasePainted = () => {
      for (const { left, top, right, bottom } of painted) {
        context.clearRect(left, top, right - left, bottom - top);
      }
      painted = [];
    };

    const drawStatic = () => {
      traceContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      traceContext.clearRect(0, 0, width, height);
      traceContext.lineWidth = 1;
      traceContext.strokeStyle = palette.trace;
      traceContext.fillStyle = palette.trace;
      traceContext.globalAlpha = 0.45;
      for (const trace of traces) {
        traceContext.beginPath();
        trace.points.forEach((point, index) =>
          index === 0 ? traceContext.moveTo(point.x, point.y) : traceContext.lineTo(point.x, point.y),
        );
        traceContext.stroke();
        const end = trace.points[trace.points.length - 1]!;
        traceContext.beginPath();
        traceContext.arc(end.x, end.y, 2.5, 0, Math.PI * 2);
        traceContext.fill();
      }
      traceContext.globalAlpha = 1;
    };

    const drawPulse = (pulse: Pulse) => {
      const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      for (let offset = 0; offset < PULSE_TAIL; offset += 3) {
        const point = pointAt(pulse.trace, pulse.distance - offset);
        context.globalAlpha = (1 - offset / PULSE_TAIL) * 0.85;
        context.beginPath();
        context.arc(point.x, point.y, offset === 0 ? 2.4 : 1.6, 0, Math.PI * 2);
        context.fill();
        bounds.left = Math.min(bounds.left, point.x);
        bounds.top = Math.min(bounds.top, point.y);
        bounds.right = Math.max(bounds.right, point.x);
        bounds.bottom = Math.max(bounds.bottom, point.y);
      }
      paint(padded(bounds, 4));
    };

    const drawPointerGlow = () => {
      paint(padded({ left: pointer.x, top: pointer.y, right: pointer.x, bottom: pointer.y }, POINTER_RADIUS + 8));
      context.fillStyle = palette.node;
      for (const trace of traces) {
        for (const point of trace.points) {
          const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
          if (distance > POINTER_RADIUS) continue;
          const strength = 1 - distance / POINTER_RADIUS;
          context.globalAlpha = strength * 0.08;
          context.beginPath();
          context.arc(point.x, point.y, 5 * strength + 1.5, 0, Math.PI * 2);
          context.fill();
          context.globalAlpha = strength * 0.4;
          context.beginPath();
          context.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const render = (elapsed: number) => {
      context.globalAlpha = 1;
      erasePainted();
      context.fillStyle = palette.pulse;
      for (let index = pulses.length - 1; index >= 0; index -= 1) {
        const pulse = pulses[index]!;
        pulse.distance += (pulse.speed * elapsed) / 1000;
        if (pulse.distance - PULSE_TAIL > pulse.trace.total) {
          pulses.splice(index, 1);
          continue;
        }
        drawPulse(pulse);
      }
      drawPointerGlow();
      context.globalAlpha = 1;
    };

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      sizeCanvas(traceCanvas, width, height, pixelRatio);
      sizeCanvas(motionCanvas, width, height, MOTION_PIXEL_RATIO);
      context.setTransform(MOTION_PIXEL_RATIO, 0, 0, MOTION_PIXEL_RATIO, 0, 0);
      painted = [];
      traces = buildTraces(width, height, contentWidth);
      pulses.length = 0;
      drawStatic();
      render(0);
    };

    const tick = (now: number) => {
      const elapsed = lastTime === 0 ? 16 : Math.min(now - lastTime, 48);
      lastTime = now;
      if (now - lastSpawn > PULSE_INTERVAL_MS && pulses.length < MAX_PULSES && traces.length > 0) {
        lastSpawn = now;
        const trace = traces[Math.floor(Math.random() * traces.length)]!;
        pulses.push({ trace, distance: 0, speed: 70 + Math.random() * 90 });
      }
      render(elapsed);
      frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (frame === 0) render(0);
    };

    const onThemeChange = () => {
      palette = readPalette();
      drawStatic();
      render(0);
    };

    resize();
    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    if (!paused && !reducedMotion) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      frame = 0;
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [paused, reducedMotion, contentWidth]);

  const togglePaused = () => {
    const next = !paused;
    savePaused(next);
    setPaused(next);
  };

  return (
    <>
      <canvas ref={traceCanvasRef} className="aegis-circuit-backdrop" aria-hidden="true" />
      <canvas ref={motionCanvasRef} className="aegis-circuit-backdrop" aria-hidden="true" />
      {reducedMotion ? null : (
        <button
          type="button"
          className="aegis-circuit-backdrop__toggle"
          onClick={togglePaused}
          aria-label={t(paused ? "redesign.foundation.backdrop.resume" : "redesign.foundation.backdrop.pause")}
        >
          {paused ? <Icons.Play size={14} /> : <Icons.Pause size={14} />}
        </button>
      )}
    </>
  );
}

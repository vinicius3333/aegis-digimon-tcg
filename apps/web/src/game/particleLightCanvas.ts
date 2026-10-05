import { createLightParticles, createLandingParticles, lightPose, type LightParticle } from "./particleLight";
import type { BurstPalette } from "./showcases";

const particles = createLightParticles();
export const arrivalLightParticles = [...particles, ...createLandingParticles()];
const stamps = new Map<string, HTMLCanvasElement>();

function mix(a: string, b: string, weight: number) {
  const first = parseInt(a.slice(1), 16),
    second = parseInt(b.slice(1), 16);
  return `rgb(${[16, 8, 0].map((shift) => Math.round(((first >> shift) & 255) * (1 - weight) + ((second >> shift) & 255) * weight)).join(" ")})`;
}

/** Small procedural textures reuse Aegis colours. Native raster/shader parity remains open. */
function stamp(material: string, palette: BurstPalette, tint: number): HTMLCanvasElement {
  const level = Math.round(tint * 16);
  const key = `${material}:${palette.base}:${palette.edge}:${level}`;
  const cached = stamps.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const colour = mix(palette.base, palette.edge, level / 16);
  if (material === "Star") {
    context.fillStyle = colour;
    context.shadowColor = colour;
    context.shadowBlur = 2;
    context.beginPath();
    // Eight rounded lobes retain the landing sparkle's silhouette.
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      const radius = 25 * (0.8 + 0.2 * Math.cos(angle * 8));
      const x = 32 + Math.cos(angle) * radius,
        y = 32 + Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
  } else if (material === "Spark") {
    const length = context.createLinearGradient(0, 0, 64, 0);
    length.addColorStop(0, colour);
    length.addColorStop(1, "transparent");
    context.fillStyle = length;
    context.fillRect(0, 0, 64, 64);
    const width = context.createLinearGradient(0, 0, 0, 64);
    width.addColorStop(0, "transparent");
    width.addColorStop(0.45, "transparent");
    width.addColorStop(0.5, "#ffffff");
    width.addColorStop(0.55, "transparent");
    width.addColorStop(1, "transparent");
    context.globalCompositeOperation = "destination-in";
    context.fillStyle = width;
    context.fillRect(0, 0, 64, 64);
  } else if (material === "Ring") {
    context.strokeStyle = colour;
    context.lineWidth = 2;
    context.shadowColor = colour;
    context.shadowBlur = 2;
    context.beginPath();
    context.arc(32, 32, 22, 0, Math.PI * 2);
    context.stroke();
  } else if (material === "Laser2") {
    const gradient = context.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.38, colour);
    gradient.addColorStop(0.46, "#ffffff");
    gradient.addColorStop(0.54, "#ffffff");
    gradient.addColorStop(0.62, colour);
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  } else if (material === "Light3") {
    const gradient = context.createLinearGradient(0, 0, 64, 0);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, 32);
    context.quadraticCurveTo(0, 23, 64, 16);
    context.lineTo(64, 48);
    context.quadraticCurveTo(0, 41, 0, 32);
    context.fill();
  } else {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(0.16, colour);
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  // Palette/role vocabulary is bounded, and long-running labs can still evict entries.
  if (stamps.size >= 256) stamps.delete(stamps.keys().next().value!);
  stamps.set(key, canvas);
  return canvas;
}

export function paintParticleLight(
  canvas: HTMLCanvasElement,
  ageMs: number,
  palette: BurstPalette,
  source: readonly LightParticle[] = particles,
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const unit = Math.min(canvas.width, canvas.height) / 48;
  for (const particle of source) {
    const pose = lightPose(particle, ageMs);
    if (!pose || pose.alpha <= 0) continue;
    const renderer = particle.emitter.renderer;
    context.save();
    context.globalCompositeOperation = renderer.material.shaderFileId === 203 ? "source-over" : "lighter";
    context.globalAlpha = pose.alpha * renderer.material.tint[3]!;
    context.translate(canvas.width / 2 + pose.x * unit, canvas.height / 2 + pose.y * unit);
    context.rotate(pose.angle);
    const size = pose.size * unit * renderer.meshSize;
    const length = renderer.mode === 1 ? size * renderer.length * pose.stretch : size;
    const height = size * pose.meshHeight;
    context.drawImage(stamp(renderer.material.name, palette, pose.tint), -length / 2, -height / 2, length, height);
    context.restore();
  }
}

import fracture from "./fieldFracture.json";

/** Shared printed-plane mesh for field and central card destruction. */
export const CARD_FRACTURE = fracture.polygons.map((points) => {
  let area = 0,
    x = 0,
    y = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length]!;
    const cross = point[0]! * next[1]! - next[0]! * point[1]!;
    area += cross;
    x += (point[0]! + next[0]!) * cross;
    y += (point[1]! + next[1]!) * cross;
  });
  const dx = x / (3 * area) - 50,
    dy = (y / (3 * area) - 50) * 1.4;
  const distance = Math.hypot(dx, dy);
  // Planar radial spread: endpoints remain an adaptation until camera/physics are measured.
  return {
    clipPath: `polygon(${points.map(([px, py]) => `${px}% ${py}%`).join(", ")})`,
    driftX: (dx / distance) * 70,
    driftY: (dy / distance) * 50,
  };
});

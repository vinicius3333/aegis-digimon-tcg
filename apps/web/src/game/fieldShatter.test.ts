import { expect, it } from "vitest";
import fracture from "./fieldFracture.json";

function contains(polygon: number[][], x: number, y: number) {
  let inside = false;
  polygon.forEach(([px, py], index) => {
    const [qx, qy] = polygon[(index + 1) % polygon.length]!;
    if (py! > y !== qy! > y && x < ((qx! - px!) * (y - py!)) / (qy! - py!) + px!) inside = !inside;
  });
  return inside;
}

it("the extracted irregular mesh covers the full printed plane without gaps or overlapping faces", () => {
  expect(fracture.polygons).toHaveLength(41);
  let area = 0;
  for (const polygon of fracture.polygons) {
    let twice = 0;
    polygon.forEach(([x, y], index) => {
      const [nx, ny] = polygon[(index + 1) % polygon.length]!;
      twice += x! * ny! - nx! * y!;
    });
    area += Math.abs(twice) / 2;
  }
  expect(area).toBeCloseTo(10000, 2);
  for (let x = 0.371; x < 100; x += 1.037)
    for (let y = 0.613; y < 100; y += 1.079)
      expect(fracture.polygons.filter((polygon) => contains(polygon, x, y))).toHaveLength(1);
});

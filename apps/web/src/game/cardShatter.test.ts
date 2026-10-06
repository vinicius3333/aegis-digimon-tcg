import { describe, expect, it } from "vitest";
import { CARD_FRACTURE } from "./cardShatter";
import { FIELD_FRACTURE } from "./fieldShatter";
import fracture from "./fieldFracture.json";

// The asset coverage test independently verifies the shared UV plane.
describe("printed card fracture", () => {
  it("uses the same 41 authored polygons on the field and central stage", () => {
    expect(CARD_FRACTURE).toBe(FIELD_FRACTURE);
    expect(CARD_FRACTURE).toHaveLength(41);
    expect(CARD_FRACTURE.map((shard) => shard.clipPath)).toEqual(
      fracture.polygons.map((points) => `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(", ")})`),
    );
  });

  it("spreads fragments in finite outward directions without adding spin or stagger", () => {
    for (const shard of CARD_FRACTURE) {
      expect(Number.isFinite(shard.driftX) && Number.isFinite(shard.driftY)).toBe(true);
      expect(Math.hypot(shard.driftX, shard.driftY)).toBeGreaterThan(0);
      expect(Object.keys(shard).sort()).toEqual(["clipPath", "driftX", "driftY"]);
    }
  });
});

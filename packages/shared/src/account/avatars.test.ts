import { describe, expect, it } from "vitest";
import { DIGIMON_WORLD_AVATARS, isDigimonWorldAvatarId } from "./avatars.js";

describe("Digimon World avatar catalogue", () => {
  it("contains the 65 unique in-game card portraits", () => {
    expect(DIGIMON_WORLD_AVATARS).toHaveLength(65);
    expect(new Set(DIGIMON_WORLD_AVATARS.map(({ id }) => id))).toHaveProperty("size", 65);
    expect(new Set(DIGIMON_WORLD_AVATARS.map(({ sourceFile }) => sourceFile))).toHaveProperty("size", 65);
  });

  it("exposes only safe stable identifiers", () => {
    for (const { id } of DIGIMON_WORLD_AVATARS) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(isDigimonWorldAvatarId(id)).toBe(true);
    }
    expect(isDigimonWorldAvatarId("../outside" as unknown)).toBe(false);
    expect(isDigimonWorldAvatarId("agumon")).toBe(false);
  });
});

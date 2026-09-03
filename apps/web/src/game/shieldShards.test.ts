import { describe, expect, it } from "vitest";
import { shieldShards } from "./boardPieces";

describe("shield shards", () => {
  it("throws the same six pieces for the same break", () => {
    expect(shieldShards(4)).toHaveLength(6);
    expect(shieldShards(4)).toEqual(shieldShards(4));
  });

  it("throws two back-to-back breaks differently", () => {
    const first = shieldShards(1).map((shard) => `${shard.x},${shard.y},${shard.spin}`);
    const second = shieldShards(2).map((shard) => `${shard.x},${shard.y},${shard.spin}`);
    expect(second).not.toEqual(first);
  });

  it("spreads every break around the pane rather than to one side", () => {
    for (const seed of [0, 1, 2, 7, 13]) {
      const shards = shieldShards(seed);
      expect(shards.some((shard) => shard.x > 0)).toBe(true);
      expect(shards.some((shard) => shard.x < 0)).toBe(true);
      expect(shards.some((shard) => shard.y > 0)).toBe(true);
      expect(shards.some((shard) => shard.y < 0)).toBe(true);
    }
  });
});

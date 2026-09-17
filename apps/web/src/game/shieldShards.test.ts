import { describe, expect, it } from "vitest";
import { buildShieldShards } from "./piece/shieldShards";

describe("shield shards", () => {
  it("throws the same six pieces for the same break", () => {
    expect(buildShieldShards(4)).toHaveLength(6);
    expect(buildShieldShards(4)).toEqual(buildShieldShards(4));
  });

  it("throws two back-to-back breaks differently", () => {
    const first = buildShieldShards(1).map((shard) => `${shard.x},${shard.y},${shard.spin}`);
    const second = buildShieldShards(2).map((shard) => `${shard.x},${shard.y},${shard.spin}`);
    expect(second).not.toEqual(first);
  });

  it("spreads every break around the pane rather than to one side", () => {
    for (const seed of [0, 1, 2, 7, 13]) {
      const shards = buildShieldShards(seed);
      expect(shards.some((shard) => shard.x > 0)).toBe(true);
      expect(shards.some((shard) => shard.x < 0)).toBe(true);
      expect(shards.some((shard) => shard.y > 0)).toBe(true);
      expect(shards.some((shard) => shard.y < 0)).toBe(true);
    }
  });
});

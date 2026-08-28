import { describe, expect, it } from "vitest";
import { CARD_SHARD_COUNT, cardShards } from "./cardShatter";

describe("cardShards", () => {
  it("cuts the card into the whole set of wedges", () => {
    expect(cardShards()).toHaveLength(CARD_SHARD_COUNT);
  });

  it("draws every wedge out of the card's centre", () => {
    for (const shard of cardShards()) expect(shard.clipPath.startsWith("polygon(50% 50%,")).toBe(true);
  });

  it("throws the shards in different directions", () => {
    const directions = cardShards().map((shard) => `${shard.driftX},${shard.driftY}`);
    expect(new Set(directions).size).toBe(CARD_SHARD_COUNT);
  });

  it("staggers the break rather than firing it all at once", () => {
    const delays = cardShards().map((shard) => shard.delayMs);
    expect(delays[0]).toBe(0);
    expect(delays.at(-1)).toBeGreaterThan(0);
  });

  it("is stable, so a shard always flies the same way", () => {
    expect(cardShards()).toEqual(cardShards());
  });

  it("honours a smaller cut", () => {
    expect(cardShards(3)).toHaveLength(3);
  });
});

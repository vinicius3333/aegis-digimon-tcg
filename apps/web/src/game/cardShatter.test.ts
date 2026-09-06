import { describe, expect, it } from "vitest";
import { CARD_CRACK_VIEWBOX, CARD_SHARD_COUNT, cardCrackPaths, cardShards } from "./cardShatter";

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

describe("cardCrackPaths", () => {
  it("opens one seam per shard, each with its two forks", () => {
    expect(cardCrackPaths()).toHaveLength(CARD_SHARD_COUNT * 3);
  });

  it("runs every seam out from the impact at the card's centre", () => {
    const centre = `M${CARD_CRACK_VIEWBOX.width / 2} ${CARD_CRACK_VIEWBOX.height / 2}`;
    const seams = cardCrackPaths().filter((_, index) => index % 3 === 0);
    for (const seam of seams) expect(seam.startsWith(centre)).toBe(true);
  });

  it("is stable, so the pane always cracks the same way", () => {
    expect(cardCrackPaths()).toEqual(cardCrackPaths());
  });
});

import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-067.js";

describe("EX4-067 Full Metal Blaze", () => {
  it("returns up to two opposing level four or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 2 },
    });
  });
  it("returns a level six or higher Digimon to deck bottom when opponent has eight cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      condition: { kind: "zoneCount", seat: "opponent", op: "gte", value: 8 },
      target: { filter: { levelComparison: { op: "gte", value: 6 } } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-067");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-067");
});

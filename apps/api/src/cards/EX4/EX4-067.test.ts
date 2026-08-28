import { describe, expect, it } from "vitest";
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
});

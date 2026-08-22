import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-087.js";

describe("BT20-087 Kota Domoto & Yuji Musya", () => {
  it("matches the memory gate, Chronicle attack trigger, and reduced-cost digivolution", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [expect.objectContaining({ kind: "SetMemory", value: 3 })],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenAttacking",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
            },
            actions: [
              expect.objectContaining({
                kind: "Digivolve",
                optional: true,
                from: ["hand"],
                reduceCost: 1,
                cost: expect.objectContaining({
                  kind: "suspend",
                  raw: expect.stringContaining("suspending this Tamer"),
                }),
                into: expect.objectContaining({
                  levelComparison: { op: "lte", value: 6 },
                  nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
                }),
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    ]);
  });
});

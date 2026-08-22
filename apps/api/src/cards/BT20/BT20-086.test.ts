import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-086.js";

describe("BT20-086 Altea", () => {
  it("preserves memory, paid placement, face-up security, and Security clauses", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "SetMemory",
            value: 3,
            condition: expect.objectContaining({ kind: "memoryAtMost", value: 2, controller: "mine" }),
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [
          expect.objectContaining({
            kind: "SecurityManipulation",
            op: "flipFaceUp",
            controller: "opponent",
            optional: true,
            abortOnDecline: true,
            cost: expect.objectContaining({
              kind: "place",
              raw: expect.stringContaining("bottom of your Digimon with such trait"),
              target: expect.objectContaining({
                filter: expect.objectContaining({
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Black"],
                  playCostLte: 4,
                  nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
                }),
                from: ["hand", "trash"],
              }),
            }),
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

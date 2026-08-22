import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-085.js";

describe("BT20-085 Shoto Kazama", () => {
  it("matches the catalog's four printed effect surfaces", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            optional: true,
            from: ["hand"],
            cost: expect.objectContaining({ kind: "return", raw: expect.stringContaining("bottom of the deck") }),
          }),
          expect.objectContaining({
            kind: "PlayWithoutCost",
            optional: true,
            from: ["trash"],
            condition: expect.objectContaining({ kind: "youHaveNone" }),
            target: expect.objectContaining({
              filter: expect.objectContaining({
                levels: [3],
                nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "trait" }],
              }),
            }),
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "EndOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "Suspend",
            cost: expect.objectContaining({ kind: "suspend", raw: expect.stringContaining("suspending this Tamer") }),
            abortOnDecline: true,
          }),
          expect.objectContaining({
            kind: "ModifyDP",
            amount: 2000,
            duration: "untilOpponentTurnEnd",
            target: expect.objectContaining({
              filter: expect.objectContaining({
                nameOrTrait: [{ tokens: ["Vortex Warriors"], match: "trait" }],
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

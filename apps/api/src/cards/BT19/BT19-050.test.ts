import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-050 Rapidmon", () => {
  it("preserves Blast Digivolve, both play triggers, and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-050");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Counter",
        isFromHand: true,
        actions: [],
        keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
      },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } },
          { kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
        ],
      })),
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", amount: 4000, duration: "permanent", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-050", () => {
  it("preserves Blast Digivolve, Digimon/Tamer suspension lock, and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-050");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
          },
        ],
      })),
      { trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 4000, duration: "permanent" }] },
    ]);
  });
});

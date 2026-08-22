import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-062.js";

describe("BT19-062", () => {
  it("preserves Rush, Collision, effect-placed Option trashing, and end-turn player attack", () => {
    const card = runtimeCompiledCard("BT19-062");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Rush" }] },
      { trigger: "Static", keywords: [{ keyword: "Collision" }] },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Trash",
            target: {
              filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
            },
          },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "Attack",
            attackPlayer: true,
            condition: { kind: "opponentHas", filter: { unsuspended: true, kind: ["Digimon"] } },
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Collision" }] },
    ]);
  });
});

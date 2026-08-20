import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-054.js";

describe("BT23-054 Magnamon", () => {
  it("draws and prevents only an opponent effect from bouncing the protected Royal Knight", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-054", as: "magna" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    const magnaId = s.perm("magna").permanentId;
    const magnaCardId = s.perm("magna").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magna"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).verb.returnToHand([magnaCardId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === magnaId)).toBe(true);

    s.state.turnSeat = 0;
    await advance(s.engine).verb.returnToHand([magnaCardId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === magnaId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === magnaCardId)).toBe(true);
  });

  it("declares Blocker and Armor Purge", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Blocker", "Armor Purge"]);
  });

  it("draws 1 and protects one Royal Knight or CS Digimon from opponent bounce on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
      expect(actions[1]).toMatchObject({
        kind: "Restrict",
        restriction: "beReturned",
        duration: "untilOpponentTurnEnd",
        byOpponentEffectsOnly: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Knight", "CS"], match: "trait" }],
          },
          count: 1,
        },
      });
    }
  });
});

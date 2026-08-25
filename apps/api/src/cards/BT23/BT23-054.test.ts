import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-054.js";

describe("BT23-054 Magnamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-054")).toMatchObject({
      cardId: "BT23-054",
      nameEn: "Magnamon",
      colors: ["Black", "Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 4 },
        { color: "Blue", level: 3, memoryCost: 4 },
      ],
      forms: ["Armor Form"],
      attributes: ["Free"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Veemon"], cost: 3, isAlternate: true },
      { level: 3, traits: ["CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

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

  it("exposes Blocker and Armor Purge through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-054", as: "magna" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("magna"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("magna"), "Armor Purge")).toBe(true);
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

  it.each(["BT2-021", "BT23-037"])("digivolves for 3 from a Veemon/level-3 CS base (%s)", (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-054", as: "magna" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
  });
});

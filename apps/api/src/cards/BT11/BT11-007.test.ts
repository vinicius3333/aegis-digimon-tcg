import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-007.js";

describe("BT11-007 Biyomon", () => {
  it("matches the catalog and carries both complete printed contracts", () => {
    expect(getCardDefinition("BT11-007")).toMatchObject({
      cardId: "BT11-007",
      nameEn: "Biyomon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Bird"],
      effectText:
        "[On Play] Reveal the top 3 cards of your deck. Add 1 red Digimon card with [Vaccine] in its traits and 1 red Tamer card among them to your hand. Place the rest at the bottom of your deck in any order.",
      inheritedEffectText: "[On Deletion] If you have a red Tamer in play, gain 1 memory.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    colors: ["Red"],
                    nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }],
                  },
                  count: 1,
                  to: "hand",
                },
                { filter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Red"] }, count: 1, to: "hand" },
              ],
              rest: "deckBottom",
            },
          ],
        },
        {
          trigger: "OnDeletion",
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("reveals three, adds the required red Vaccine Digimon and red Tamer, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-007", as: "biyomon" }],
          deck: ["BT1-009", "BT1-085", "BT11-007"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-085"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT11-007"]);
  });

  it("adds the one available bucket and bottoms the other revealed cards (Q2050)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-007", as: "biyomon" }],
          deck: ["BT2-009", "BT1-028", "BT1-085"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT1-085");
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-028", "BT2-009"]);
  });

  it("gains 1 memory on its host's deletion while a red Tamer remains", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-007"] }, "BT1-085"] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when its host and red Tamer are deleted simultaneously (Q2052)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-015", as: "host", under: ["BT11-007"] },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId, s.perm("tamer").permanentId]);

    expect(s.state.memory).toBe(0);
  });
});

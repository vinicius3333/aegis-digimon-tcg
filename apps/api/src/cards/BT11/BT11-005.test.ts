import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-005.js";

describe("BT11-005 Koromon", () => {
  it("matches the catalog, ruling guard, and complete inherited contract", () => {
    expect(getCardDefinition("BT11-005")).toMatchObject({
      cardId: "BT11-005",
      nameEn: "Koromon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Opponent's Turn][Once Per Turn] When an opponent's Digimon is deleted, if this Digimon has [Greymon] in its name, ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "onDeletionOf",
              notSimultaneous: true,
              sourceFilter: { controller: "opponent", kind: ["Digimon"] },
              actions: [
                {
                  kind: "Draw",
                  controller: "mine",
                  amount: 1,
                  condition: {
                    kind: "selfHasNameContaining",
                    names: ["Greymon"],
                    raw: "this Digimon has [Greymon] in its name",
                  },
                },
              ],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("draws when an opponent's Digimon is deleted on their turn and its host is Greymon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-005"] }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT1-009");
  });

  it("does not draw if the Greymon host is deleted in the same batch (Q2046)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-005"] }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId, s.perm("victim").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("draws only once for two separate opponent Digimon deletions in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-005"] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw on its controller's turn or from a non-Greymon host", async () => {
    for (const { host, turnSeat } of [
      { host: "BT1-015", turnSeat: 0 as const },
      { host: "BT1-009", turnSeat: 1 as const },
    ]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: host, as: "host", under: ["BT11-005"] }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      });
      s.state.turnSeat = turnSeat;

      await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);

      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.deck).toHaveLength(1);
    }
  });
});

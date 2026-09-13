import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-001.js";

describe("BT11-001 Yokomon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-001")).toMatchObject({
      cardId: "BT11-001",
      nameEn: "Yokomon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Bulb"],
      inheritedEffectText: "[On Deletion] If you have a red Tamer in play, ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnDeletion",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                  colors: ["Red"],
                },
                raw: "you have a red Tamer in play",
              },
            },
          ],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("draws 1 on its host's deletion while a red Tamer remains in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-001"] }, "BT1-085"],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-080", as: "titan", dp: 13000, suspended: true }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        security: ["BT1-009", "BT1-009"],
      },
    });
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("titan").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId),
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not count an opponent's red Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT11-001"] }],
        deck: ["BT1-009"],
      },
      1: { battleArea: ["BT1-085"] },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});

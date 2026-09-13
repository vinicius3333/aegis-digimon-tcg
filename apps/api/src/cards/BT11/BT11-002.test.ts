import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-002.js";

describe("BT11-002 Wanyamon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-002")).toMatchObject({
      cardId: "BT11-002",
      nameEn: "Wanyamon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[When Attacking][Once Per Turn] If you have a blue Tamer in play, ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenAttacking",
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
                  colors: ["Blue"],
                },
                raw: "you have a blue Tamer in play",
              },
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

  it("draws when its host attacks with a blue Tamer, only once in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "host", under: ["BT11-002"], dp: 20_000 }, "BT1-086", "BT1-013"],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target1", suspended: true },
          { card: "BT1-010", as: "target2", suspended: true },
          { card: "BT1-011", as: "target3", suspended: true },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    const attack = (target: "target1" | "target2" | "target3") =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent" as const, permanentId: s.perm(target).permanentId },
      });

    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(attack("target1")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack("target2")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.suspend([s.perm("target3").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(attack("target3")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("does not count an opponent's blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "host", under: ["BT11-002"] }],
        deck: ["BT1-009"],
      },
      1: { battleArea: ["BT1-086"], security: ["BT1-009"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});

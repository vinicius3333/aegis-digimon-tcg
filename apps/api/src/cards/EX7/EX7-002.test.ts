import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./EX7-002.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-002 Hiyarimon", () => {
  it("matches the catalog identity and complete inherited IR contract", () => {
    expect(getCardDefinition("EX7-002")).toMatchObject({
      cardId: "EX7-002",
      nameEn: "Hiyarimon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Lesser"],
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] If your opponent has no Digimon with digivolution cards, ＜Draw 1＞.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            condition: {
              kind: "opponentHasNone",
              filter: { digivolutionCards: "hasAny", controllerDefault: "opponent", kind: ["Digimon"] },
              raw: "your opponent has no Digimon with digivolution cards",
            },
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });

  it("inherits once-per-turn draw when attacking if the opponent has no stacked Digimon", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          condition: {
            kind: "opponentHasNone",
            filter: { digivolutionCards: "hasAny", controllerDefault: "opponent", kind: ["Digimon"] },
          },
        },
      ],
    }));

  it("draws through a real attack only when the opponent has no digivolution cards", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-009"],
        deck: ["BT1-009"],
        battleArea: [{ card: "BT1-028", as: "host", dp: 5000, under: ["EX7-002"] }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000, suspended: true }] },
    });
    expect(s.perm("host").topCard?.cardId).toBe("BT1-028");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX7-002"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("does not draw when the opposing Digimon has a digivolution card", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-009"],
        deck: ["BT1-009"],
        battleArea: [{ card: "BT1-028", as: "host", dp: 5000, under: ["EX7-002"] }],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "target", dp: 3000, suspended: true, under: ["BT1-014"] }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once across two legal attacks by the same inherited host", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009"],
        battleArea: [{ card: "BT1-028", as: "host", dp: 5000, under: ["EX7-002"] }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 3000, suspended: true },
          { card: "BT1-009", as: "second", dp: 3000, suspended: true },
        ],
      },
    });
    await s.ready();
    for (const defender of ["first", "second"]) {
      const defenderId = s.perm(defender).permanentId;
      await advance(s.engine).verb.suspend([defenderId]);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !observe(s.engine).isAttacking() &&
          !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId),
      );
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId)).toBe(false);
      expect(s.state.players[0]!.hand).toHaveLength(1);
      expect(s.state.players[0]!.deck).toHaveLength(1);
      if (defender === "first") await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    }
    assertNoLoudGap(s);
  });

  it("resets the inherited draw on the next own turn through the real turn loop", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        battleArea: [{ card: "BT1-028", as: "host", dp: 5000, under: ["EX7-002"] }],
      },
      1: {
        hand: ["BT1-009"],
        deck: ["BT1-009"],
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    const attack = (target: { kind: "player" } | { kind: "permanent"; permanentId: string }) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target,
      });

    expect(attack({ kind: "player" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    // There is no public second-attack verb for a suspended Digimon. The production test seam
    // unsuspends the same host so the same-turn once-per-turn refusal can still be observed.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack({ kind: "player" })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(attack({ kind: "player" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 4);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
    assertNoLoudGap(s);
  });
});

import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-004.js";
import "../index.js";

describe("EX5-004 Frimon", () => {
  it("matches the catalog and compiles its inherited once-per-turn name condition", () => {
    expect(getCardDefinition("EX5-004")).toMatchObject({
      cardId: "EX5-004",
      nameEn: "Frimon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText: expect.stringContaining("[When Attacking] [Once Per Turn]"),
    });
    expect(compiled.effects).toHaveLength(1);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "selfHasNameContaining", names: ["Leomon"] },
        },
      ],
    });
  });

  it("draws once from a Leomon-name stack and stays silent for a near-miss stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-055", as: "leomon", under: ["EX5-004", "BT1-066"] },
            { card: "BT1-074", as: "nearMiss", under: ["EX5-004", "BT1-066"] },
          ],
          deck: [
            { card: "BT1-010", as: "leomonDraw" },
            { card: "BT1-011", as: "nearMissShouldStay" },
          ],
        },
        1: { security: ["BT1-009", "BT1-012"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.perm("leomon").topCard?.cardId).toBe("BT4-055");
    expect(s.perm("leomon").stack.map((card) => card.cardId)).toEqual(["EX5-004", "BT1-066"]);
    expect(s.perm("nearMiss").topCard?.cardId).toBe("BT1-074");
    expect(s.perm("nearMiss").stack.map((card) => card.cardId)).toEqual(["EX5-004", "BT1-066"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("leomonDraw").instanceId),
    );

    expect(s.perm("leomon").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("nearMissShouldStay").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nearMiss").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("nearMiss").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nearMissShouldStay").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("nearMissShouldStay").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not draw twice in one turn and resets after the owner's real next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-055", as: "leomon", under: ["EX5-004", "BT1-066"] }],
          hand: [{ card: "BT1-036", as: "garurumon" }],
          deck: [
            { card: "BT1-010", as: "firstDraw" },
            { card: "BT1-011", as: "sameTurnMustStay" },
            { card: "BT1-012", as: "nextTurnDraw" },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const turn = advance(s.engine);
    await turn.waitForMainPhase(0);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 2 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId),
    );

    preferred.push(s.perm("leomon").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("leomon").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sameTurnMustStay").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("sameTurnMustStay").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn.waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn.waitForMainPhase(0);
    await s.ready();
    expect(s.perm("leomon").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nextTurnDraw").instanceId),
    );

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

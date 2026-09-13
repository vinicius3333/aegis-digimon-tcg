import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-148.js";

describe("P-148 Wanyamon", () => {
  it("encodes the inherited once-per-turn conditional Draw 1", () => {
    const compiled = runtimeCompiledCard("P-148")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: expect.objectContaining({
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["NSp"], match: "trait" }] },
              }),
            }),
          ],
        }),
      ]),
    );
  });

  it("denies a same-turn repeat and re-arms on the next natural owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-035", as: "host", under: ["P-148"] },
            { card: "BT10-028", as: "plain", under: ["P-148"] },
          ],
          hand: ["BT1-009"],
          deck: [
            { card: "BT1-009", as: "effectA" },
            { card: "BT1-010", as: "normalB" },
            { card: "BT1-011", as: "effectC" },
            ...Array(17).fill("BT1-012"),
          ],
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
        1: {
          deck: Array(20).fill("BT1-013"),
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("effectA").instanceId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("effectA").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toContain(s.inst("normalB").instanceId);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toContain(s.inst("normalB").instanceId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("normalB").instanceId);
    await settle(
      () =>
        s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("effectC").instanceId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("effectC").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

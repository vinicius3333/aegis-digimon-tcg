import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT14/BT14-083.js";
import "../ST4/ST4-13.js";
import "./EX1-020.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>, alias: string): string {
  const source = (s.engine as unknown as { cardSourceOf: (card: unknown) => unknown }).cardSourceOf(
    s.perm(alias).topCard,
  );
  return effectsOf(EffectTiming.OnDeclaration, source as never).find((effect) =>
    effect.effectKey.startsWith("ST4-13/"),
  )!.effectKey;
}

describe("EX1-020 Plesiomon", () => {
  it("can attack an opponent's unsuspended Digimon without digivolution cards on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("plesiomon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesiomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("draws 2 when an opponent's digivolution card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-020", as: "plesiomon" }],
          hand: [{ card: "BT14-083", as: "de-digivolver" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-032", under: ["BT1-009"], as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("de-digivolver").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("does not draw when your own digivolution card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-020", as: "plesiomon" },
            { card: "ST4-13", as: "own", under: ["ST4-03", "ST4-08"] },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("own").topCard.instanceId,
        effectKey: mainEffectKey(s, "own"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("own").stack.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("draws only once when two opponent sources are trashed in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-020", as: "plesiomon" }],
          hand: [
            { card: "BT14-083", as: "first" },
            { card: "BT14-083", as: "second" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-032", as: "firstTarget", under: ["BT1-009"] },
            { card: "BT1-032", as: "secondTarget", under: ["BT1-009"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").stack.length === 0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("secondTarget").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("does not draw during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }], hand: ["BT1-009"], deck: ["BT1-001"] },
        1: {
          battleArea: [{ card: "ST4-13", as: "opponent", under: ["ST4-03", "ST4-08"] }],
          hand: ["BT1-009"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: s.perm("opponent").topCard.instanceId,
        effectKey: mainEffectKey(s, "opponent"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

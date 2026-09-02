import { describe, it, expect } from "vitest";
import { EffectTiming, requireCardDefinition, Zone } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
// Self-register every compiled-IR card module (boot side-effect) so the engine can
// look up BT7-040's registered IR — this A3 drives the REGISTERED card, not a hand
// ledger (the synthetic ledger tests in modifiers.test.ts/interpreter.test.ts bypass
// the on-field sweep and so were green while the card was actually inert — Pitfall 3).
import "./BT7-040.js";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";

describe("BT7-040 Rasenmon — Main Digi-Burst", () => {
  it("trashes up to 4 digivolution cards and gives one opposing Digimon -3000 DP per card", async () => {
    const s = setupEngine(
      {
        // Legal yellow stack: L2 egg -> L3 Herissmon -> L4 Filmon -> L5 Stefilmon -> L6 Rasenmon.
        0: {
          battleArea: [{ card: "BT7-040", under: ["BT1-005", "BT7-031", "BT7-034", "BT7-039"], as: "rasenmon" }],
        },
        1: {
          battleArea: [
            { card: "BT7-040", dp: 15000, as: "target" },
            { card: "BT7-039", dp: 15000, as: "otherTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("rasenmon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-040/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rasenmon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rasenmon").stack.length === 0 && s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("otherTarget").currentDP).toBe(15000);
  });

  it("activates Digi-Burst up to 4 with only 3 stack cards and scales by the paid count (Q1569)", async () => {
    const s = setupEngine(
      {
        // Legal yellow stack: L3 Herissmon -> L4 Filmon -> L5 Stefilmon -> L6 Rasenmon.
        0: { battleArea: [{ card: "BT7-040", under: ["BT7-031", "BT7-034", "BT7-039"], as: "rasenmon" }] },
        1: { battleArea: [{ card: "BT7-040", dp: 15000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("rasenmon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-040/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rasenmon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rasenmon").stack.length === 0 && s.perm("target").currentDP === 6000);

    expect(s.perm("target").currentDP).toBe(6000);
  });
});

/**
 * Drive the REAL digivolve intent into BT7-040 and return the memory actually paid
 * (the shared gauge delta), with `extraReduction` optionally pre-installing a continuous
 * -N digivolve-cost reduction matching the base (the "effect on another card that reduces
 * digivolution costs" of KB Q1568).
 */
async function paidToEvolveIntoBT7040(opts: { security: number; extraReduction?: number }) {
  const s = setupEngine({
    0: {
      // Base: a Lv.5 Yellow Digimon (BT7-040's printed EvoCost is Yellow/Lv.5/cost 5).
      battleArea: [{ card: "BT1-057", dp: 5000, as: "base" }],
      // The digivolution TARGET sits in hand — the hand-resident SET cost effect must fire
      // from here (the bug: the on-field base guard made it inert in hand).
      hand: [{ card: "BT7-040", as: "evolving" }],
      security: Array.from({ length: opts.security }, () => "AD1-001"),
    },
  });
  const p0 = s.state.players[0]!;
  const base = s.perm("base");
  const evolving = s.inst("evolving");
  s.state.memory = 10; // enough headroom for any of the asserted costs

  if (opts.extraReduction !== undefined) {
    // A real continuous reduction in the same ledger the digivolve cost-calc reads — the
    // "another card reduces digivolution costs by 2" of Q1568. Base-keyed (ignores `into`).
    advance(s.engine).ledgers.modifiers.addEvoCostAdjustment(
      ({ target }) => target.permanentId === base.permanentId,
      -opts.extraReduction,
      false,
      { continuous: false },
    );
  }

  await s.engine.recomputeContinuousEffects();
  const before = s.state.memory;
  s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: base.permanentId,
    instanceId: evolving.instanceId,
  });
  await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT7-040"));
  const evolved = p0.battleArea.some((p) => p.topCard?.cardId === "BT7-040");
  return { paid: before - s.state.memory, evolved };
}

describe("A3 BT7-040 — hand-resident SET digivolve cost = security count (Q1568)", () => {
  it("with 4 security, digivolving into BT7-040 pays cost 4 (not the printed evoCost 5)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT7040({ security: 4 });
    expect(evolved).toBe(true);
    expect(paid).toBe(4);
  });

  it("with 0 security, the cost is floored at 1 (documented behavior `if count <= 0, count = 1`)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT7040({ security: 0 });
    expect(evolved).toBe(true);
    expect(paid).toBe(1);
  });

  it("Q1568 layering: with 4 security AND a -2 reduction, pays 4 - 2 = 2 (SET first, then delta)", async () => {
    const { paid, evolved } = await paidToEvolveIntoBT7040({ security: 4, extraReduction: 2 });
    expect(evolved).toBe(true);
    // NOT 5 (printed), NOT 4 (SET ignoring the reduction), NOT 3 (delta off printed): the SET
    // base (4) is computed first, then the -2 subtracts → 2.
    expect(paid).toBe(2);
  });
});

/**
 * A3 (CR-01) — the hand-resident SET digivolve cost is OWNER-scoped: ONE player's
 * installed BT7-040 cost static must NOT match the OTHER player's digivolve into the same
 * card id.
 *
 * Scenario: ONLY player 0 holds a BT7-040 in hand (its `Static` cost effect installs an
 * adjustment closed over player 0's own context — SET = player 0's security count = 7).
 * Player 1 has a Lv.5 base on their battle area and does NOT hold a BT7-040. We ask the
 * cost-calc directly — `evoCostFor(player1Base, BT7-040def)` — the same fold the digivolve
 * action consults. Player 0's static must contribute NOTHING to player 1's digivolve, so
 * the result must be `undefined` (no match).
 *
 * Asserting via `evoCostFor` (rather than a full two-player digivolve where both players
 * hold BT7-040) is deliberate: when both hold it, the victim's OWN adjustment is inserted
 * last and the setFixed "last-set-wins" fold coincidentally masks the cross-player leak.
 * Querying with only the attacker's static present makes the leak observable and
 * order-independent.
 *
 * FAILS-WHEN-REVERTED lever: drop the owner-seat gate in the interpreter's hand-resident
 * selfRef predicate (`if (m.into === undefined || m.into.cardId !== selfCardId) return
 * false; return m.target.controllerSeat === ctx.source.ownerSeat;` → `return m.into ===
 * undefined || m.into.cardId === selfCardId;`). Player 0's adjustment then matches player
 * 1's base (`into.cardId === "BT7-040"` with no seat gate) and `evoCostFor` returns
 * `{ fixed: 7 }` (player 0's security count) instead of `undefined` → RED.
 */
function evoCostForSeat1Base(opts: { seat0Security: number }): EngineSetup {
  const s = setupEngine({
    0: {
      // ONLY player 0 holds a BT7-040 in hand — installs the hand-resident SET cost static.
      hand: ["BT7-040"],
      security: Array.from({ length: opts.seat0Security }, () => "AD1-001"),
    },
    // Player 1's own board: a Lv.5 Yellow base. Player 1 holds NO BT7-040.
    1: { battleArea: [{ card: "BT1-057", dp: 5000, as: "base1" }] },
  });
  s.state.turnSeat = 1; // player 1's turn — the hypothetical digivolve is theirs
  return s;
}

describe("A3 BT7-040 (CR-01) — hand-resident SET cost is owner-scoped (no cross-player corruption)", () => {
  it("player 0's hand static does NOT match player 1's digivolve into BT7-040 (no leak)", async () => {
    const s = evoCostForSeat1Base({ seat0Security: 7 });
    await s.engine.recomputeContinuousEffects();
    const into = requireCardDefinition("BT7-040");
    // The same fold the digivolve action reads. With the owner-seat gate, player 0's static
    // contributes nothing to player 1's digivolve → no match. Without the gate it leaks
    // player 0's security-count SET (7) onto player 1.
    expect(advance(s.engine).ledgers.modifiers.evoCostFor(s.perm("base1"), into)).toBeUndefined();
  });

  it("player 1's OWN BT7-040 still applies to player 1 (owner-scope does not over-block)", async () => {
    const s = evoCostForSeat1Base({ seat0Security: 7 });
    s.give(1, Zone.Hand, "BT7-040");
    for (let i = 0; i < 4; i++) s.give(1, Zone.Security, "AD1-001");
    await s.engine.recomputeContinuousEffects();
    const into = requireCardDefinition("BT7-040");
    // Player 1's own static matches their own base (SET = player 1's security count = 4).
    expect(advance(s.engine).ledgers.modifiers.evoCostFor(s.perm("base1"), into)).toEqual({ fixed: 4 });
  });
});

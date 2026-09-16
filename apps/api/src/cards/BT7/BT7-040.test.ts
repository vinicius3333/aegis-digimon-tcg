import { describe, it, expect } from "vitest";
import { EffectTiming, requireCardDefinition, Zone } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT7-040.js";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";

describe("BT7-040 Rasenmon — Main Digi-Burst", () => {
  it("trashes up to 4 digivolution cards and gives one opposing Digimon -3000 DP per card", async () => {
    const s = setupEngine(
      {
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

async function paidToEvolveIntoBT7040(opts: { security: number; extraReduction?: number }) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT1-057", dp: 5000, as: "base" }],
      hand: [{ card: "BT7-040", as: "evolving" }],
      security: Array.from({ length: opts.security }, () => "AD1-001"),
    },
  });
  const p0 = s.state.players[0]!;
  const base = s.perm("base");
  const evolving = s.inst("evolving");
  s.state.memory = 10;

  if (opts.extraReduction !== undefined) {
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
    expect(paid).toBe(2);
  });
});

function evoCostForSeat1Base(opts: { seat0Security: number }): EngineSetup {
  const s = setupEngine({
    0: {
      hand: ["BT7-040"],
      security: Array.from({ length: opts.seat0Security }, () => "AD1-001"),
    },
    1: { battleArea: [{ card: "BT1-057", dp: 5000, as: "base1" }] },
  });
  s.state.turnSeat = 1;
  return s;
}

describe("A3 BT7-040 (CR-01) — hand-resident SET cost is owner-scoped (no cross-player corruption)", () => {
  it("player 0's hand static does NOT match player 1's digivolve into BT7-040 (no leak)", async () => {
    const s = evoCostForSeat1Base({ seat0Security: 7 });
    await s.engine.recomputeContinuousEffects();
    const into = requireCardDefinition("BT7-040");
    expect(advance(s.engine).ledgers.modifiers.evoCostFor(s.perm("base1"), into)).toBeUndefined();
  });

  it("player 1's OWN BT7-040 still applies to player 1 (owner-scope does not over-block)", async () => {
    const s = evoCostForSeat1Base({ seat0Security: 7 });
    s.give(1, Zone.Hand, "BT7-040");
    for (let i = 0; i < 4; i++) s.give(1, Zone.Security, "AD1-001");
    await s.engine.recomputeContinuousEffects();
    const into = requireCardDefinition("BT7-040");
    expect(advance(s.engine).ledgers.modifiers.evoCostFor(s.perm("base1"), into)).toEqual({ fixed: 4 });
  });
});

import { describe, it, expect } from "vitest";
import { EffectTiming, type CardInstance } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-025.js";

const CYBERDRAMON = "BT10-025";
const BLUE_FLARE_HOST = "BT10-024"; // MetalGreymon — in-cutoff Digimon with the [Blue Flare] trait

/** The OnDeclaration effectKey BT10-025 surfaces for its [Hand][Main] clause, if any. */
function handMainEffectKey(s: EngineSetup, instance: CardInstance): string | undefined {
  const source = (s.engine as unknown as { cardSourceOf(i: CardInstance): CardSource }).cardSourceOf(instance);
  return effectsOf(EffectTiming.OnDeclaration, source).find((e) => e.effectKey.startsWith(`${CYBERDRAMON}/`))
    ?.effectKey;
}

describe("BT10-025 — [Hand][Main] activates only while the card is in hand (CR §15-14-2-1)", () => {
  it("encodes one hand-resident paid placement, bound unsuspend, and inherited threshold aura", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "Main",
        isFromHand: true,
        actions: [
          expect.objectContaining({
            kind: "PlaceUnder",
            position: "bottom",
            bindHostAs: "bt10025PlaceHost",
            cost: expect.objectContaining({ kind: "payMemory", memory: 3 }),
          }),
          expect.objectContaining({
            kind: "Unsuspend",
            target: expect.objectContaining({ filter: expect.objectContaining({ boundRef: "bt10025PlaceHost" }) }),
          }),
        ],
      }),
      expect.objectContaining({ trigger: "AllTurns", isInherited: true }),
    ]);
  });

  it("activates from HAND: places itself under the [Blue Flare] host for 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CYBERDRAMON, as: "cyber" }],
          battleArea: [
            { card: BLUE_FLARE_HOST, as: "host", under: ["BT10-019"], suspended: true },
            { card: "BT10-019", as: "otherBlueFlare", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    const cyber = s.inst("cyber");

    const effectKey = handMainEffectKey(s, cyber);
    expect(effectKey).toBeDefined();
    expect(JSON.parse(cyber.activatableEffectsJson)).toEqual([
      expect.objectContaining({ instanceId: cyber.instanceId, effectKey }),
    ]);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: cyber.instanceId, effectKey: effectKey! }),
    ).toEqual({ ok: true });

    await settle(
      () => s.perm("host").stack.some((c) => c.instanceId === cyber.instanceId) && !s.perm("host").isSuspended,
    );

    expect(s.perm("host").stack.some((c) => c.instanceId === cyber.instanceId)).toBe(true);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CYBERDRAMON, "BT10-019"]);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("otherBlueFlare").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === cyber.instanceId)).toBe(false);
    expect(s.state.memory).toBe(0); // "by paying 3 memory"
  });

  it("does not pay memory or move itself when only a non-Blue-Flare host exists", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CYBERDRAMON, as: "cyber" }],
        battleArea: [{ card: "BT1-025", as: "host", suspended: true }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const cyber = s.inst("cyber");
    const effectKey = handMainEffectKey(s, cyber);
    expect(effectKey).toBeDefined();
    expect(cyber.activatableEffectsJson).toBe("");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: cyber.instanceId,
        effectKey: effectKey!,
      }).ok,
    ).toBe(false);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === cyber.instanceId)).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("requires enough memory-gauge room to pay 3 before placing itself under a valid host", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CYBERDRAMON, as: "cyber" }],
        battleArea: [{ card: "BT10-024", as: "host", suspended: true }],
      },
    });
    s.state.memory = -8;
    await s.ready();
    const cyber = s.inst("cyber");
    const effectKey = handMainEffectKey(s, cyber);
    expect(effectKey).toBeDefined();
    expect(cyber.activatableEffectsJson).toBe("");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: cyber.instanceId,
        effectKey: effectKey!,
      }).ok,
    ).toBe(false);
    await settle();

    expect(s.state.memory).toBe(-8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === cyber.instanceId)).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does NOT activate while the same card sits on the BATTLE AREA", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CYBERDRAMON, as: "cyber" },
            { card: BLUE_FLARE_HOST, as: "host", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    const cyber = s.perm("cyber").topCard!;

    // The effect is still SURFACED at the activation window (it is the card's only [Main]
    // clause); what the residency guard denies is triggering it from the wrong zone.
    const effectKey = handMainEffectKey(s, cyber);
    expect(effectKey).toBeDefined();

    const res = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: cyber.instanceId,
      effectKey: effectKey!,
    });
    expect(res.ok).toBe(false);

    await settle(() => false, 20); // flush any stray continuation
    expect(s.perm("host").stack.some((c) => c.instanceId === cyber.instanceId)).toBe(false);
    expect(s.state.memory).toBe(3); // no cost paid — the effect never ran
    // REVERT-CONFIRM-RED: drop the `isFromHand` branch in `activated`'s base guard (builders.ts)
    // => the on-field copy passes the guard => `res.ok` is true and the host is unsuspended.
  });
});

describe("BT10-025 — inherited DP threshold", () => {
  it("grants +1000 DP only while the opponent has at least 2 Digimon", async () => {
    const below = setupEngine({
      0: { battleArea: [{ card: "BT10-024", as: "host", under: [CYBERDRAMON] }] },
      1: { battleArea: ["BT10-018"] },
    });
    await below.ready();
    expect(below.perm("host").currentDP).toBe(below.perm("host").baseDP);

    const exact = setupEngine({
      0: { battleArea: [{ card: "BT10-024", as: "host", under: [CYBERDRAMON] }] },
      1: { battleArea: ["BT10-018", "BT10-019"] },
    });
    await exact.ready();
    expect(exact.perm("host").currentDP).toBe(exact.perm("host").baseDP + 1000);
    expect(observe(exact.engine).hasKeyword(exact.perm("host"), "Rush")).toBe(false);
  });
});

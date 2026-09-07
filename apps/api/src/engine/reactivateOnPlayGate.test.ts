import { describe, it, expect, afterEach } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { setupEngine } from "./testkit/harness.js";
import { onPlay, whenDigivolving } from "./effects/builders.js";
import { registerCard, unregisterCard } from "./effects/registry.js";
import type { EffectModule } from "./effects/EffectModule.js";
import { internalsOf } from "./testkit/internals.js";

// Finding 11 (HIGH): GameEngine.reactivateOnPlay (EX3-065 "activate 1 of that Digimon's
// [On Play] effects") gated the chosen effect only on canActivate, never canTrigger — the
// module function that encodes the effect's declared `when` condition (builders.ts:47
// `canTrigger: (ctx) => baseGuard(ctx) && (extra ? extra(ctx) : true)`). A re-activated
// effect whose `when` no longer holds (e.g. a "when digivolving" one-shot condition, or any
// state-dependent gate) would still resolve as long as its (often unconditional)
// canActivate passed.
//
// This overrides a real, cataloged card's OnPlay module (CardSource construction requires a
// registered CardDefinition — a made-up cardId throws "Unknown cardId") with a synthetic
// effect whose `when` is unconditionally false and whose `canActivate` is unconditionally
// true, so any resolution the gate lets through is directly attributable to the missing
// canTrigger check. Saves and restores whatever module (if any) was previously registered
// under this id in afterEach — vitest.config.ts runs with isolate:false, so the module
// registry is a single shared Map reused across every test file in the worker.
//
// FAILS-WHEN-REVERTED: drop the canTrigger check from reactivateOnPlay and `triggered`
// becomes 1.

const TEST_CARD = "BT1-020"; // Groundramon, Red Lv.5 — a real, cataloged card id

describe("GameEngine.reactivateOnPlay canTrigger gate (finding 11)", () => {
  let triggered = 0;

  const stub: EffectModule = {
    cardId: TEST_CARD,
    effectsForTiming(timing, source) {
      if (timing !== EffectTiming.OnPlay) return [];
      return [
        onPlay({
          source,
          effectKey: `${TEST_CARD}/reactivate-gate-test`,
          description: "test: when() is always false, canActivate() is always true",
          when: () => false,
          canActivate: () => true,
          resolve: async () => {
            triggered += 1;
          },
        }),
      ];
    },
  };

  let original: EffectModule | undefined;

  afterEach(() => {
    unregisterCard(TEST_CARD);
    if (original !== undefined) registerCard(original);
    triggered = 0;
  });

  it("does not resolve a chosen OnPlay effect whose when-gate (canTrigger) is false, even though canActivate is true", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard(stub);
    // No decisions expected in this test (a single OnPlay effect, no chooseOption), so the
    // Test Seam's default (no auto-response opts) requestDecision handler suffices.
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } });
    const perm = s.perm("perm");

    await (s.engine as unknown as { reactivateOnPlay(id: string): Promise<void> }).reactivateOnPlay(perm.permanentId);

    expect(triggered).toBe(0);
  });

  it("suppresses a targeted When Digivolving reactivation before its body can run", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard({
      cardId: TEST_CARD,
      effectsForTiming(timing, source) {
        if (timing !== EffectTiming.WhenDigivolving) return [];
        return [
          whenDigivolving({
            source,
            effectKey: `${TEST_CARD}/reactivate-restricted-wd`,
            description: "test restricted When Digivolving body",
            resolve: async () => {
              triggered += 1;
            },
          }),
        ];
      },
    });
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } });
    const perm = s.perm("perm");
    internalsOf(s.engine).continuous.addRestriction(
      perm.permanentId,
      "cannotActivateWhenDigivolving",
      EffectDuration.Permanent,
    );

    await (
      s.engine as unknown as {
        reactivateOnPlay(id: string, opts: { timings: EffectTiming[] }): Promise<void>;
      }
    ).reactivateOnPlay(perm.permanentId, { timings: [EffectTiming.WhenDigivolving] });

    expect(triggered).toBe(0);
  });

  it("preserves a Main/OnDeclaration reactivation candidate when no mask applies", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard({
      cardId: TEST_CARD,
      effectsForTiming(timing, source) {
        if (timing !== EffectTiming.OnDeclaration) return [];
        return [
          onPlay({
            source,
            effectKey: `${TEST_CARD}/reactivate-main`,
            description: "test Main reactivation body",
            resolve: async () => {
              triggered += 1;
            },
          }),
        ];
      },
    });
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } });
    const perm = s.perm("perm");

    await (
      s.engine as unknown as {
        reactivateOnPlay(id: string, opts: { timings: EffectTiming[] }): Promise<void>;
      }
    ).reactivateOnPlay(perm.permanentId, { timings: [EffectTiming.OnDeclaration] });

    expect(triggered).toBe(1);
  });

  it("blocks a restricted When Digivolving body before its cost and once-per-turn use", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard({
      cardId: TEST_CARD,
      effectsForTiming(timing, source) {
        if (timing !== EffectTiming.WhenDigivolving) return [];
        return [
          whenDigivolving({
            source,
            effectKey: `${TEST_CARD}/restricted-costed-wd`,
            description: "test restricted costed WD",
            maxPerTurn: 1,
            resolve: async (ctx) => {
              triggered += 1;
              ctx.fx.gainMemory(-1);
            },
          }),
        ];
      },
    });
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } });
    const perm = s.perm("perm");
    internalsOf(s.engine).continuous.addRestriction(
      perm.permanentId,
      "cannotActivateWhenDigivolving",
      EffectDuration.Permanent,
    );
    internalsOf(s.engine).continuous.addRestriction(perm.permanentId, "beAffected", EffectDuration.Permanent);
    const beforeMemory = s.state.memory;
    await (
      s.engine as unknown as { reactivateOnPlay(id: string, opts: { timings: EffectTiming[] }): Promise<boolean> }
    ).reactivateOnPlay(perm.permanentId, { timings: [EffectTiming.WhenDigivolving] });
    expect(triggered).toBe(0);
    expect(s.state.memory).toBe(beforeMemory);
    expect(internalsOf(s.engine).tracker.count(s.inst("perm").instanceId, `${TEST_CARD}/restricted-costed-wd`)).toBe(0);
  });

  it("lets beAffected bypass a timing mask and execute the real body", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard({
      cardId: TEST_CARD,
      effectsForTiming(timing, source) {
        if (timing !== EffectTiming.WhenDigivolving) return [];
        return [
          whenDigivolving({
            source,
            effectKey: `${TEST_CARD}/immune-wd`,
            description: "test immune WD",
            resolve: async (ctx) => {
              triggered += 1;
              ctx.fx.gainMemory(-1);
            },
          }),
        ];
      },
    });
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } });
    const perm = s.perm("perm");
    const internals = internalsOf(s.engine);
    internals.continuous.addEffectTimingDisable(perm.permanentId, ["whenDigivolving"], EffectDuration.Permanent);
    internals.continuous.addRestriction(perm.permanentId, "beAffected", EffectDuration.Permanent);
    const beforeMemory = s.state.memory;
    await (
      s.engine as unknown as { reactivateOnPlay(id: string, opts: { timings: EffectTiming[] }): Promise<boolean> }
    ).reactivateOnPlay(perm.permanentId, { timings: [EffectTiming.WhenDigivolving] });
    expect(triggered).toBe(1);
    expect(s.state.memory).toBe(beforeMemory - 1);
  });

  it("blocks a targeted On Play reactivation under activateOnPlay", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard({
      cardId: TEST_CARD,
      effectsForTiming(timing, source) {
        if (timing !== EffectTiming.OnPlay) return [];
        return [
          onPlay({
            source,
            effectKey: `${TEST_CARD}/restricted-op`,
            description: "test restricted OP",
            resolve: async () => {
              triggered += 1;
            },
          }),
        ];
      },
    });
    const s = setupEngine({ 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } });
    const perm = s.perm("perm");
    internalsOf(s.engine).continuous.addRestriction(perm.permanentId, "activateOnPlay", EffectDuration.Permanent);
    await (s.engine as unknown as { reactivateOnPlay(id: string): Promise<boolean> }).reactivateOnPlay(
      perm.permanentId,
    );
    expect(triggered).toBe(0);
  });

  it("rechecks a selected candidate after an awaited choice changes its restriction", async () => {
    original = unregisterCard(TEST_CARD);
    registerCard({
      cardId: TEST_CARD,
      effectsForTiming(timing, source) {
        if (timing !== EffectTiming.OnPlay) return [];
        return [0, 1].map((index) =>
          onPlay({
            source,
            effectKey: `${TEST_CARD}/awaited-choice-${index}`,
            description: `test awaited candidate ${index}`,
            resolve: async (ctx) => {
              triggered += 1;
              ctx.fx.gainMemory(-1);
            },
          }),
        );
      },
    });
    const s = setupEngine(
      { 0: { battleArea: [{ card: TEST_CARD, dp: 1000, as: "perm" }] } },
      { autoSelectCards: false },
    );
    const perm = s.perm("perm");
    const beforeMemory = s.state.memory;
    const promise = (s.engine as unknown as { reactivateOnPlay(id: string): Promise<boolean> }).reactivateOnPlay(
      perm.permanentId,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("chooseOption");
    internalsOf(s.engine).continuous.addRestriction(perm.permanentId, "activateOnPlay", EffectDuration.Permanent);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending!.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await expect(promise).resolves.toBe(false);
    expect(triggered).toBe(0);
    expect(s.state.memory).toBe(beforeMemory);
  });
});

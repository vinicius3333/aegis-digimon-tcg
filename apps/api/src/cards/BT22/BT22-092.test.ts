import { describe, it, expect, afterEach } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard, unregisterCard } from "../../engine/effects/registry.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { compiled } from "./BT22-092.js";
import "./index.js";

// A3 for BT22-092 (Jimmy KEN):
//   [Start of Your Turn] If you have 2 or less memory, set your memory to 3.
//   [Your Turn] When your Digimon are played or digivolve, if any of them have the [Flame]
//     or [CS] trait, by suspending this Tamer, activate 1 of those Digimon's [Main] effects.
//     If this activated any effect, gain 1 memory.
//
// FAILS-WHEN-REVERTED: the pre-fix module left the [Your Turn] clause entirely unimplemented
// (a BLOCKED comment, no timing branch) — a Flame/CS Digimon entering never suspended this
// Tamer nor re-fired that Digimon's [Main] effect.
//
// BT15-009 (a real, cataloged [Flame]-trait Digimon) is overridden with a synthetic [Main]
// effect (gain 2 memory) so the assertion is a simple, self-contained memory delta.
const JIMMY = "BT22-092";
const FLAME_DIGIMON = "BT15-009"; // Meramon — [Flame] trait

it("registers exclusive compiled IR for play and digivolve reactivation", () => {
  const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
  expect(effect).toMatchObject({ timingOverride: "OnEnterFieldAnyone" });
  expect((effect?.actions[0] as any).actions[0]).toMatchObject({
    kind: "ReactivateEffect",
    fromTrigger: "Main",
    targetSource: "triggerSubject",
  });
});

describe("BT22-092 [Start of Your Turn] set memory to 3 when at 2 or less", () => {
  it("sets memory to 3 when it starts at 2 or less", async () => {
    const s = setup({ 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } });
    s.state.memory = 1;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartTurn, {});
    await settle(() => false, 60);

    expect(s.state.memory).toBe(3);
  });

  it("does NOT change memory when it starts above 2", async () => {
    const s = setup({ 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } });
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartTurn, {});
    await settle(() => false, 60);

    expect(s.state.memory).toBe(5);
  });

  it("does NOT fire on the opponent's turn start", async () => {
    const s = setup({ 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } });
    s.state.turnSeat = 1; // opponent's turn
    s.state.memory = -1; // seat 0's own-perspective memory is 1 (turn-relative, opponent's turn)

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartTurn, {});
    await settle(() => false, 60);

    // [Start of YOUR Turn] must not fire on the opponent's turn — memory unchanged.
    expect(s.state.memory).toBe(-1);
  });
});

describe("BT22-092 [Your Turn] Flame/CS Digimon enters -> suspend Jimmy, reactivate its [Main]", () => {
  let fired = 0;
  const stub: EffectModule = {
    cardId: FLAME_DIGIMON,
    effectsForTiming(timing, source) {
      if (timing !== EffectTiming.OnDeclaration) return [];
      return [
        activated({
          source,
          effectKey: `${FLAME_DIGIMON}/test-reactivate-target`,
          description: "test: [Main] gain 2 memory",
          resolve: async (ctx) => {
            fired += 1;
            ctx.fx.gainMemory(2);
          },
        }),
      ];
    },
  };
  let original: EffectModule | undefined;

  afterEach(() => {
    unregisterCard(FLAME_DIGIMON);
    if (original !== undefined) registerCard(original);
    fired = 0;
  });

  it("suspends Jimmy KEN and re-fires the entering [Flame] Digimon's [Main] effect, then gains 1 memory", async () => {
    original = unregisterCard(FLAME_DIGIMON);
    registerCard(stub);

    const s = setup(
      { 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const flameDigi = s.putOnBoard(0, { card: FLAME_DIGIMON, dp: 3000 });
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnEnterFieldAnyone, { subjectPermanentId: flameDigi.permanentId });

    await settle(() => fired > 0, 400);

    // The Flame Digimon's [Main] effect re-fired (gain 2), then Jimmy's own "gain 1" fired.
    expect(fired).toBe(1);
    expect(s.state.memory).toBe(8); // 5 + 2 (reactivated) + 1 (activated-any bonus)
    expect(s.perm("jimmy").isSuspended).toBe(true);
  });

  it("leaves Jimmy KEN unsuspended and reactivates nothing when the suspend cost is declined", async () => {
    original = unregisterCard(FLAME_DIGIMON);
    registerCard(stub);

    const s = setup(
      { 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const flameDigi = s.putOnBoard(0, { card: FLAME_DIGIMON, dp: 3000 });
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnEnterFieldAnyone, { subjectPermanentId: flameDigi.permanentId });
    await settle(() => false, 60);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(fired).toBe(0);
    expect(s.state.memory).toBe(5);
    expect(s.perm("jimmy").isSuspended).toBe(false);
  });

  it("does NOT reactivate for a Digimon without [Flame]/[CS] trait", async () => {
    const s = setup(
      { 0: { battleArea: [{ card: JIMMY, dp: 0, as: "jimmy" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // BT3-073 (WereGarurumon) has neither [Flame] nor [CS].
    const other = s.putOnBoard(0, { card: "BT3-073", dp: 6000 });
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnEnterFieldAnyone, { subjectPermanentId: other.permanentId });
    await settle(() => false, 60);

    expect(s.state.memory).toBe(5);
    expect(s.perm("jimmy").isSuspended).toBe(false);
  });
});

describe("BT22-092 [Security]", () => {
  it("plays itself from security without paying the cost", async () => {
    const s = setup({ 0: { security: [{ card: JIMMY, as: "jimmy", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("jimmy"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("jimmy").instanceId)).toBe(true);
  });
});

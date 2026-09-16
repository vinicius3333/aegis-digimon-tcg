import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-092.js";
import "./index.js";

const JIMMY = "BT22-092";
const FLAME_DIGIMON = "BT22-010";

it("registers exclusive compiled IR for play and digivolve reactivation", () => {
  const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
  expect(effect?.actions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: expect.any(Object) }),
      expect.objectContaining({
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: expect.any(Object),
      }),
    ]),
  );
  const whenPlayed = effect?.actions.find((action) => action.kind === "SubTrigger" && action.event === "whenPlayed");
  if (whenPlayed?.kind !== "SubTrigger") throw new Error("missing whenPlayed watcher");
  expect(whenPlayed.actions[0]).toMatchObject({
    kind: "ReactivateEffect",
    fromTrigger: "Main",
    targetSource: "triggerSubject",
    cost: {
      kind: "suspend",
      optional: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    },
    optional: true,
    abortOnDecline: true,
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
    s.state.turnSeat = 1;
    s.state.memory = -1;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnStartTurn, {});
    await settle(() => false, 60);

    expect(s.state.memory).toBe(-1);
  });
});

describe("BT22-092 [Your Turn] Flame/CS Digimon enters -> suspend Jimmy, reactivate its [Main]", () => {
  it("reactivates the real played Flame Digimon Main effect, then gains 1 memory", async () => {
    const s = setup(
      { 0: { battleArea: [{ card: JIMMY, as: "jimmy" }], hand: [{ card: FLAME_DIGIMON, as: "flame" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("jimmy").isSuspended, 400);

    expect(s.state.memory).toBe(4);
    expect(s.perm("jimmy").isSuspended).toBe(true);
    expect(s.perm("flame").topCard?.cardId).toBe(FLAME_DIGIMON);
  });

  it("reactivates the real Flame Digimon Main effect after a public digivolve", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: JIMMY, as: "jimmy" },
            { card: "BT22-069", as: "base" },
          ],
          hand: [{ card: FLAME_DIGIMON, as: "flame" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("flame").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jimmy").isSuspended, 400);

    expect(s.state.memory).toBe(7);
    expect(s.perm("jimmy").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe(FLAME_DIGIMON);
  });
});

describe("BT22-092 [Security]", () => {
  it("plays itself from security without paying the cost", async () => {
    const s = setup({ 0: { security: [{ card: JIMMY, as: "jimmy", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("jimmy"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("jimmy").instanceId)).toBe(true);
  });
});

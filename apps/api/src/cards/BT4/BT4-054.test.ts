import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-054.js";

describe("BT4-054 Sunflowmon", () => {
  it("Digi-Bursts 2 to lock only the next phase while allowing effect unsuspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-054", as: "sun", under: ["BT4-004", "BT4-052"] },
            { card: "BT4-053", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      internalsOf(s.engine).cardSourceOf(s.perm("sun").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-054/"))!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sun").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase"));

    expect(s.perm("sun").stack).toHaveLength(0);
    expect(s.perm("ally").topCard?.cardId).toBe("BT4-053");
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not restrict an unsuspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-054", as: "sun", under: ["BT4-004", "BT4-052"] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      internalsOf(s.engine).cardSourceOf(s.perm("sun").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-054/"))!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sun").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sun").stack.length === 2, 5000);

    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
  });
});

describe("BT4-054 Sunflowmon — KB Q&A rulings", () => {
  it("cannot choose an unsuspended opposing Digimon for its Digi-Burst effect (Q1213)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-054", as: "sun", under: ["BT4-004", "BT4-052"] }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "awake" },
            { card: "BT1-019", suspended: true, as: "sleeper" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.perm("awake").permanentId, s.perm("awake").topCard!.instanceId);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.perm("sun"))).find(
      (effect) => effect.effectKey.startsWith("BT4-054/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sun").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("sleeper"), "unsuspendDuringOwnUnsuspendPhase"));

    const offeredTargets = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredTargets).not.toContain(s.perm("awake").permanentId);
    expect(observe(s.engine).isRestricted(s.perm("awake"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("sleeper"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
  });
});

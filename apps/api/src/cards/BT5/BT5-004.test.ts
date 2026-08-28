import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-004.js";
import "./BT5-046.js";

describe("BT5-004 Yokomon", () => {
  it("gives an own Digimon +2000 DP after being trashed for Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-046", as: "host", under: [{ card: "BT5-004", as: "yokomon" }] },
            { card: "BT1-009", as: "other" },
          ],
          deck: ["BT5-044"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.engine.recomputeContinuousEffects();
    const host = s.perm("host");
    const other = s.perm("other");
    const opponent = s.perm("opponent");
    preferred.push(other.permanentId);
    const before = host.currentDP;
    const otherBefore = other.currentDP;
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-046/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => other.currentDP === otherBefore + 2000);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("yokomon").instanceId)).toBe(true);
    expect(host.currentDP).toBe(before);
    expect(other.currentDP).toBe(otherBefore + 2000);
    expect(opponent.currentDP).toBe(opponent.baseDP);
    assertNoLoudGap(s);
  });

  it("does not trigger when another Digimon's Digi-Burst trashes a different source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-046", as: "watchedHost", under: [{ card: "BT5-004", as: "yokomon" }] },
            { card: "BT5-046", as: "otherHost", under: [{ card: "BT1-009", as: "otherSource" }] },
          ],
          deck: ["BT5-044"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const watchedHost = s.perm("watchedHost");
    const before = watchedHost.currentDP;
    const source = (s.engine as any).cardSourceOf(s.perm("otherHost").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-046/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("otherHost").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherHost").stack.length === 0);

    expect(s.perm("watchedHost").currentDP).toBe(before);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("yokomon").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not trigger when the source is trashed outside Digi-Burst", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-046", as: "host", under: [{ card: "BT5-004", as: "yokomon" }] }] },
    });
    await s.ready();
    const host = s.perm("host");
    const before = host.currentDP;

    await advance(s.engine).verb.trashDigivolutionCards(host.permanentId, [s.inst("yokomon").instanceId]);

    expect(host.currentDP).toBe(before);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("yokomon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("works after a legal breeding evolution and expires at the owner's turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT5-004", as: "yokomon" },
          hand: [{ card: "BT5-046", as: "evolving" }],
          battleArea: [{ card: "BT1-009", as: "ally" }],
          deck: ["BT5-044"],
        },
        1: { deck: ["BT5-044"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yokomon").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yokomon").topCard?.cardId === "BT5-046");
    expect(s.perm("yokomon").stack.map((card) => card.cardId)).toEqual(["BT5-004"]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("yokomon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("yokomon").inBreeding);
    s.state.phase = Phase.Main;
    preferred.push(s.perm("ally").permanentId);
    const ally = s.perm("ally");
    const before = ally.currentDP;
    const source = (s.engine as any).cardSourceOf(s.perm("yokomon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-046/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("yokomon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => ally.currentDP === before + 2000);
    expect(ally.currentDP).toBe(before + 2000);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("yokomon").instanceId)).toBe(true);

    await advance(s.engine).runTurn(0);
    expect(ally.currentDP).toBe(before);
    assertNoLoudGap(s);
  });
});

import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-064.js";
import "./BT4-068.js";

describe("BT4-064 Sunarizamon", () => {
  it("returns itself to hand after it is trashed for Digi-Burst", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-068", as: "baboon", under: ["BT1-001", { card: "BT4-064", as: "sunari" }] }] },
        1: { battleArea: [{ card: "BT4-066", as: "target", under: ["BT4-063"] }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.perm("baboon"))).find(
      (effect) => effect.effectKey.startsWith("BT4-068/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("baboon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sunari").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sunari").instanceId)).toBe(true);
  });
});

describe("BT4-064 Sunarizamon — KB Q&A rulings", () => {
  // Engine gap: a [Main] activation has no active window token, so the Digi-Burst discard
  // SubTrigger resolves inline during cost payment instead of waiting for the effect.
  it.fails("returns to hand only after the <Digi-Burst> effect has resolved (Q1220)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-068", as: "baboon", under: ["BT1-001", { card: "BT4-064", as: "sunari" }] }] },
        1: { battleArea: [{ card: "BT4-066", as: "target", under: ["BT4-063"] }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const sunariId = s.inst("sunari").instanceId;
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.perm("baboon"))).find(
      (effect) => effect.effectKey.startsWith("BT4-068/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("baboon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === sunariId));

    const moves = s.events.flatMap((event, index) => (event.kind === "cardsMoved" ? [{ event, index }] : []));
    const burstTrash = moves.find(({ event }) => event.to === "trash" && event.instanceIds.includes(sunariId));
    const deDigivolve = moves.find(({ event }) => event.strippedStackTops?.reason === "deDigivolve");
    const returnToHand = moves.find(({ event }) => event.to === "hand" && event.instanceIds.includes(sunariId));

    expect(s.perm("target").topCard?.cardId).toBe("BT4-063");
    expect(burstTrash).toBeDefined();
    expect(deDigivolve).toBeDefined();
    expect(returnToHand).toBeDefined();
    expect(burstTrash!.index).toBeLessThan(deDigivolve!.index);
    expect(deDigivolve!.index).toBeLessThan(returnToHand!.index);
  });
});

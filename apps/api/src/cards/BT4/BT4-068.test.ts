import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-068.js";

describe("BT4-068 Baboongamon", () => {
  it("Digi-Bursts 2 to De-Digivolve 1 a 7-cost-or-less opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-068", as: "baboon", under: [{ card: "BT4-064", as: "sunari" }, "BT1-001", "BT1-001"] },
          ],
        },
        1: { battleArea: [{ card: "BT4-066", as: "target", under: [{ card: "BT4-063", as: "base" }] }] },
      },
      { autoSelectCards: true },
    );
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("baboon").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-068/"))!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("baboon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT4-063");

    expect(s.perm("baboon").stack).toHaveLength(1);
    expect(s.perm("target").topCard?.cardId).toBe("BT4-063");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT4-066")).toBe(true);
  });

  it("does not pay Digi-Burst when no legal play-cost target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-068", as: "baboon", under: [{ card: "BT4-064", as: "sunari" }, "BT1-001", "BT1-001"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-025", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("baboon").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-068/"))!.effectKey;
    const eventsBefore = s.events.length;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("baboon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.slice(eventsBefore).some((event) => event.kind === "effectActivated"));

    expect(s.perm("baboon").stack).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sunari").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-025")).toBe(true);
  });
});

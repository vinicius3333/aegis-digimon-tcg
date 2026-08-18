import { EffectTiming, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST5-13.js";

interface CardEffectTestSeam {
  cardSourceOf(instance: CardInstance): CardSource;
  buildEffectContext(source: CardSource, trigger: object): EffectContext;
}

describe("ST5-13 BlitzGreymon", () => {
  it("has Security Attack +1 and Digi-Bursts 2 to give +4000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-13", under: ["ST5-03", "ST5-08"], as: "blitz" }, { card: "ST5-03", as: "target" }] } }, { autoSelectCards: true });
    await s.ready();
    const seam = s.engine as unknown as CardEffectTestSeam;
    const source = seam.cardSourceOf(s.perm("blitz").topCard);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("ST5-13/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("blitz").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("blitz").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("blitz"), "SecurityAttack")).toBe(true);
  });

  it("keeps the Digi-Burst DP bonus through the opponent's turn, then expires it", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-13", under: ["ST5-03", "ST5-08"], as: "blitz" },
            { card: "ST5-03", as: "target" },
          ],
          deck: ["BT1-001"],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);
    await s.ready();
    const seam = s.engine as unknown as CardEffectTestSeam;
    const source = seam.cardSourceOf(s.perm("blitz").topCard);
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((candidate) =>
      candidate.effectKey.startsWith("ST5-13/"),
    )!;
    const ctx = seam.buildEffectContext(source, {});
    await effect.resolve(ctx);
    expect(s.perm("target").currentDP).toBe(5000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(1000);
  });
});

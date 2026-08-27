import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-059.js";
import "./BT5-046.js";
import "./BT5-050.js";
import "./BT5-004.js";

describe("BT5-050 Weedmon", () => {
  it("gains 1 memory after being trashed for its host's Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-059", as: "host", under: [{ card: "BT5-047" }, { card: "BT5-050", as: "weed" }] }],
        },
        1: { battleArea: [{ card: "BT4-073", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("weed").instanceId);
    await s.engine.recomputeContinuousEffects();
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT4-059/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && s.perm("host").stack.length === 0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("does not trigger when another Digimon's Digi-Burst trashes the card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-059", as: "weedHost", under: [{ card: "BT5-047" }, { card: "BT5-050" }] },
            { card: "BT5-046", as: "otherHost", under: [{ card: "BT5-004" }] },
          ],
          deck: ["BT5-047"],
        },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
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
    await settle(() => s.state.players[0]!.trash.length > 0);
    expect(s.state.memory).toBe(0);
  });

  it("does not trigger on a Digi-Burst trash during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-059", as: "host", under: [{ card: "BT5-047" }, { card: "BT5-050", as: "weed" }] }],
      },
    });
    const weedId = s.inst("weed").instanceId;
    s.state.turnSeat = 1;
    await (s.engine as any).primitives.trashDigivolutionCards(s.perm("host").permanentId, [weedId], {
      byEffectSeat: 1,
      isDigiBurst: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === weedId));
    expect(s.state.memory).toBe(0);
  });
});

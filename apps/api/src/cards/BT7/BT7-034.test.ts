import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-034.js";

describe("BT7-034 Filmon", () => {
  it("Digi-Bursts 2 to give an opposing Digimon Security Attack -2 without trashing own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Legal yellow stack: L2 egg -> L3 Herissmon -> L4 Filmon.
            { card: "BT7-034", under: ["BT1-005", "BT7-031"], as: "filmon" },
            { card: "BT7-032", under: ["BT1-005"], as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT6-049", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("filmon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-034/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("filmon").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("filmon").stack.length === 0 &&
        observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("ally").stack).toHaveLength(1);
  });
});

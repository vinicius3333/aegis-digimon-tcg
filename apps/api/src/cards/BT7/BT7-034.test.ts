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
            { card: "BT7-034", under: ["BT1-001", "BT1-002"], as: "filmon" },
            { card: "BT1-010", as: "ally" },
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
    expect(s.perm("ally").topCard).toBeDefined();
  });
});

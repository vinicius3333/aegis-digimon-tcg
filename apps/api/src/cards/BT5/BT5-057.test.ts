import { EffectTiming, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-046.js";
import "./BT5-047.js";
import "./BT5-057.js";

describe("BT5-057 Rosemon", () => {
  it("Digi-Bursts 3 to give all own Digi-Burst Digimon Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT5-057",
              as: "rose",
              under: [
                { card: "BT5-047", as: "roseLv3" },
                { card: "BT5-051", as: "roseLv4" },
                { card: "BT5-052", as: "roseLv5" },
              ],
            },
            { card: "BT5-046", as: "ally", under: ["BT5-004"] },
            { card: "BT1-009", as: "nonBurst" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT5-046", as: "opponentBurst", under: ["BT5-004"] },
            { card: "BT1-009", as: "opponentNonBurst" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const source = (s.engine as unknown as { cardSourceOf(instance: CardInstance): CardSource }).cardSourceOf(
      s.perm("rose").topCard!,
    );
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-057/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("rose").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("rose"), "SecurityAttack") === 1 &&
        observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack") === 1,
    );

    expect(s.perm("rose").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("roseLv3").instanceId,
        s.inst("roseLv4").instanceId,
        s.inst("roseLv5").instanceId,
      ]),
    );
    expect(observe(s.engine).keywordAmount(s.perm("rose"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("nonBurst"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("opponentBurst"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("opponentNonBurst"), "SecurityAttack")).toBe(0);

    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 0);
    expect(observe(s.engine).keywordAmount(s.perm("rose"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(0);
  });
});

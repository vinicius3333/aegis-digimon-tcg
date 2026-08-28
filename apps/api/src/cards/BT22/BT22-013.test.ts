import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-013.js";

describe("BT22-013 WarGreymon", () => {
  it("targets Agumon for the hand digivolution, deletes lowest DP, and trashes top security as inherited", () => {
    const handMain = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(handMain).toMatchObject({ isFromHand: true });
    expect(handMain?.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Agumon"], match: "name" }],
        },
      },
      costOverride: 6,
      ignoreRequirements: true,
    });

    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({ kind: "Modal", choose: 1 });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Trash",
            target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
          }),
        ],
      }),
    );
  });

  it("digivolves an Agumon into this hand card for exactly 6 when Nokia is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-008", as: "agumon" },
            { card: "BT22-084", as: "nokia" },
          ],
          hand: [{ card: "BT22-013", as: "warGreymon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("warGreymon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.perm("agumon").topCard?.cardId === "BT22-013");

    expect(s.perm("agumon").topCard?.cardId).toBe("BT22-013");
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toContain("BT22-008");
    expect(s.state.memory).toBe(4);
  });

  it("deletes exactly one lowest-DP opponent through the second When Digivolving mode", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-013", as: "warGreymon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "lowest" },
            { card: "BT22-010", dp: 5000, as: "higher" },
          ],
        },
      },
      { preferOptionIndex: 1, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("warGreymon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("higher").permanentId,
    ]);
  });

  it("trashes the opponent's top security once when inherited by Omnimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-015", under: ["BT22-013"], as: "omnimon" }] },
      1: {
        security: [
          { card: "BT1-001", as: "top" },
          { card: "BT1-002", as: "bottom" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("omnimon"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("omnimon"));

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });
});

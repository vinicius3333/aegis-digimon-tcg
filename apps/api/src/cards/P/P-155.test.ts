import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-155.js";

describe("P-155 Pawn Device", () => {
  it("encodes Main Draw 1 followed by placing itself in the battle area", () => {
    const main = runtimeCompiledCard("P-155")!.effects.find((effect) =>
      effect.actions.some((action) => action.kind === "PlaceInBattleAreaSelf"),
    )!;
    expect(main).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("encodes Delay's non-red Option trash cost and Security deletion/hand return", () => {
    const compiled = runtimeCompiledCard("P-155")!;
    const delay = compiled.effects.find((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"))!;
    expect(delay).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", kind: ["Option"], excludeColors: ["Red"] }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } },
                count: 1,
              },
            },
            { kind: "AddToHandSelf" },
          ],
        }),
      ]),
    );
  });

  it("deletes an opposing Digimon at the 11000-DP security boundary and returns itself", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-155", as: "pawn" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 11000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("pawn"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("pawn").instanceId)).toBe(true);
  });
});

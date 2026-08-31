import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-224.js";

describe("P-224 Kotone Amano", () => {
  it("places an Xros Heart or Twilight Digimon under this Tamer before the conditional draw", () => {
    const card = runtimeCompiledCard("P-224")!;
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Draw",
            amount: 1,
            condition: { kind: "handSizeAtMost", value: 7 },
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              target: {
                count: 1,
                from: ["hand", "trash"],
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Xros Heart", "Twilight"], match: "trait" }],
                },
              },
            },
          },
        ],
      });
    }
  });

  it("suspends itself to play a level 5 or higher Xros Heart Digimon from under any Tamer at cost -1", () => {
    expect(runtimeCompiledCard("P-224")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["underTamer"],
          payCost: true,
          costOverride: { kind: "reduceCost", amount: 1 },
          cost: { kind: "suspend", target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "underTamer",
              levelComparison: { op: "gte", value: 5 },
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(runtimeCompiledCard("P-224")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("P-224 engine behavior", () => {
  it("plays itself from Security through its Security effect", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-224", as: "kotone" }] },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("kotone"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("kotone").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("kotone").instanceId)).toBe(true);
  });

  it("uses its Main effect to suspend itself and play a level-5 Xros Heart Digimon from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-224", as: "kotone" },
            { card: "BT10-087", under: [{ card: "BT10-012", as: "shoutmon" }], as: "taiki" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const effectKey = (observe(s.engine).activatableEffects(s.perm("kotone")) as Array<{ effectKey: string }>)[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("kotone").instanceId,
        effectKey: effectKey.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("kotone").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("shoutmon").instanceId)).toBe(
      true,
    );
  });
});

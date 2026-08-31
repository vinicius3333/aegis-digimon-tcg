import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-225.js";

describe("P-225 DigiLab", () => {
  it("waives color requirements while you have a CS Digimon or Tamer", () => {
    expect(runtimeCompiledCard("P-225")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("draws 1 and places itself in the battle area", () => {
    expect(
      runtimeCompiledCard("P-225")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.actions[0]?.kind === "Draw",
      ),
    ).toMatchObject({ actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }] });
  });

  it("delays a top-stack CS placement cost into 2 memory", () => {
    expect(
      runtimeCompiledCard("P-225")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              count: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "gte", value: 4 },
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
              },
            },
          },
        },
      ],
    });
  });

  it("places itself in the battle area from security", () => {
    expect(runtimeCompiledCard("P-225")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
  });
});
describe("P-225 engine behavior", () => {
  it("draws one and places itself in the battle area through Main", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-225", as: "lab" }],
        deck: [{ card: "BT1-001", as: "drawn" }],
        battleArea: [{ card: "BT22-008", as: "cs" }],
      },
    });
    s.state.memory = 20;
    await s.ready();
    const labId = s.inst("lab").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: labId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === labId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
  });

  it("places itself in the battle area through Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-225", as: "option" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle();
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    ).toBe(true);
  });
});

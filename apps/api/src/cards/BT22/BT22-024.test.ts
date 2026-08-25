import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-024.js";

describe("BT22-024 MarineBullmon", () => {
  it("uses the Shellmon placement into Sangomon, fixed-cost hand digivolution, and self-stack inherited play", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ isFromHand: true, condition: { kind: "youHave" } });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: {
        filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Shellmon"], match: "name" }] },
        from: ["trash"],
        count: 1,
      },
      underFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Sangomon"], match: "name" }] },
      position: "bottom",
      optional: true,
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Sangomon"], match: "name" }],
          sameAsPlaceUnderTarget: true,
        },
        count: 1,
      },
      from: ["hand"],
      payCost: 3,
      ignoreRequirements: true,
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfAttack");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      target: { source: "thisDigimon", filter: { levelComparison: { op: "lte", value: 4 } }, count: 1 },
      optional: true,
    });
  });

  it("places Shellmon from trash under the chosen Sangomon and evolves for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-031", as: "sangomon" },
            { card: "BT22-086", as: "yao" },
          ],
          hand: [{ card: "BT22-024", as: "marineBullmon" }],
          trash: [
            { card: "BT22-021", as: "shellmon" },
            { card: "BT22-020", as: "invalid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("marineBullmon"));
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );
    await settle(() => s.perm("sangomon").topCard?.cardId === "BT22-024");

    expect(s.state.memory).toBe(2);
    expect(s.perm("sangomon").topCard?.cardId).toBe("BT22-024");
    expect(s.perm("sangomon").stack.map((card) => card.cardId)).toEqual(["BT22-021", "BT21-031"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("invalid").instanceId]);
  });

  it("does not expose the hand effect without Yao Qinglan", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-031", as: "sangomon" }],
        hand: [{ card: "BT22-024", as: "marineBullmon" }],
        trash: ["BT22-021"],
      },
    });
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.inst("marineBullmon"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("BT22-024/"),
    );

    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();
    expect(s.perm("sangomon").topCard?.cardId).toBe("BT21-031");
  });

  it("plays one eligible level-4 Aquatic source at end of attack only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-023",
              as: "host",
              under: ["BT22-021", "BT22-024"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT22-023",
      "BT22-021",
    ]);

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});

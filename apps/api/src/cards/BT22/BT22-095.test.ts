import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-095.js";

describe("BT22-095 Akemi Suedou", () => {
  it("requires suspending this Tamer for the Eater trigger and gates Draw 1 on hand size", () => {
    const trigger = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(trigger?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Eater"], match: "trait" }],
      },
      cost: {
        kind: "suspend",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      },
      optional: true,
    });
    const subTrigger = trigger?.actions[0];
    if (subTrigger?.kind !== "SubTrigger") throw new Error("BT22-095 Eater trigger is missing");
    expect(subTrigger.actions[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
    });
  });

  it("places this Tamer under a Mother Eater as its bottom digivolution card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      underFilter: {
        controller: "mine",
        zone: "breeding",
        nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }],
      },
      position: "bottom",
    });
  });

  it("plays itself from security without paying the cost", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("grants all three inherited keywords only while the host is Mother Eater", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited?.actions).toHaveLength(3);
    const inheritedActions = inherited?.actions ?? [];
    expect(
      inheritedActions.map((action) =>
        action.kind === "Aura" && action.effect.kind === "keyword" ? action.effect.keyword.keyword : undefined,
      ),
    ).toEqual(["Rush", "Alliance", "Scapegoat"]);
    for (const action of inheritedActions) {
      if (action.kind !== "Aura") throw new Error("BT22-095 inherited keyword is not an Aura");
      expect(action.while).toMatchObject({ kind: "selfHasName", names: ["Mother Eater"] });
    }
  });

  it("plays the checked physical Tamer from security without changing memory", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT22-095", as: "akemi", faceUp: true }] } });
    const akemiId = s.inst("akemi").instanceId;
    const initialMemory = s.state.memory;

    await (s.engine as any).fireTiming(EffectTiming.SecuritySkill, { sourceInstanceId: akemiId });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === akemiId));

    expect(s.state.memory).toBe(initialMemory);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === akemiId)).toBe(true);
  });

  it("suspends and gains memory when a real Eater Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-095", as: "akemi" }],
          hand: [{ card: "BT22-079", as: "eater" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eater").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("akemi").isSuspended, 400);

    expect(s.perm("akemi").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3); // 5 - 3 play + 1 trigger; the hand remains <= 7 so Draw 1 also resolves.
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("publicly places this Tamer under the Mother Eater in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", under: [{ card: "BT22-079", as: "existing" }], as: "mother" },
          battleArea: [{ card: "BT22-095", as: "akemi" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.perm("akemi").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-095/"),
    )!.effectKey;
    const akemiId = s.inst("akemi").instanceId;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: akemiId, effectKey })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.perm("mother").stack.map((card) => card.instanceId)).toEqual([
      akemiId,
      s.inst("existing").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

});

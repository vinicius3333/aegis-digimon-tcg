import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-031.js";

describe("BT23-031 Angewomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-031")).toMatchObject({
      cardId: "BT23-031",
      nameEn: "Angewomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 3 },
        { color: "Purple", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Archangel", "CS"],
      inheritedEffectText: "＜Alliance＞",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("pays 3 less with LadyDevimon and recovers deck top even from zero security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-067", as: "ladyDevimon" }],
        hand: [{ card: "BT23-031", as: "angewomon" }],
        deck: [{ card: "BT23-100", as: "recovered" }],
      },
    });
    s.state.memory = 10;
    const angewomonId = s.inst("angewomon").instanceId;
    const recoveredId = s.inst("recovered").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: recoveredId });
  });

  it("grants inherited Alliance to its carrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-035", as: "carrier", under: ["BT23-031"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(true);
  });

  it("reduces its play cost when you have LadyDevimon or Mirei Mikagura", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["LadyDevimon", "Mirei Mikagura"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("adds the top security card to hand, then recovers if three or fewer remain", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "toHand",
        controller: "mine",
        amount: 1,
        toTop: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      });
    }
  });

  it("declares inherited Alliance", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Alliance" }],
    });
  });

  it("recovers after removing the fourth security card but not after removing the fifth", async () => {
    const atFour = setupEngine({
      0: {
        battleArea: [{ card: "BT23-031", as: "angewomon" }],
        security: [{ card: "BT1-012", as: "top" }, "BT1-009", "BT1-010", "BT1-011"],
        deck: [{ card: "BT23-100", as: "recovery" }],
      },
    });
    await advance(atFour.engine).fire(EffectTiming.OnPlay, atFour.perm("angewomon"));
    expect(atFour.state.players[0]!.security).toHaveLength(4);
    expect(atFour.state.players[0]!.hand.map((card) => card.instanceId)).toContain(atFour.inst("top").instanceId);
    expect(atFour.state.players[0]!.security.map((card) => card.instanceId)).toContain(
      atFour.inst("recovery").instanceId,
    );

    const atFive = setupEngine({
      0: {
        battleArea: [{ card: "BT23-031", as: "angewomon" }],
        security: [{ card: "BT1-013", as: "top" }, "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: [{ card: "BT23-100", as: "deckTop" }],
      },
    });
    await advance(atFive.engine).fire(EffectTiming.OnPlay, atFive.perm("angewomon"));
    expect(atFive.state.players[0]!.security).toHaveLength(4);
    expect(atFive.state.players[0]!.hand.map((card) => card.instanceId)).toContain(atFive.inst("top").instanceId);
    expect(atFive.state.players[0]!.deck.map((card) => card.instanceId)).toContain(atFive.inst("deckTop").instanceId);
  });

  it("does not reduce the hand play cost without LadyDevimon or Mirei Mikagura", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT23-031", as: "angewomon" }], deck: ["BT1-009"] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angewomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("angewomon").instanceId,
      ),
    );
    expect(s.state.memory).toBe(3);
  });
});

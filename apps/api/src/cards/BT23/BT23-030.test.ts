import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-030.js";

describe("BT23-030 Etemon", () => {
  it("pays exactly 1, plays only an eligible card free and grants both keywords to one Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-030", as: "etemon" }],
          hand: [
            { card: "BT23-049", as: "eligible" },
            { card: "BT23-055", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const eligibleId = s.inst("eligible").instanceId;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("etemon"));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-055")).toBe(true);
    const recipients = s.state.players[0]!.battleArea.filter(
      (card) => observe(s.engine).hasKeyword(card, "Reboot") && observe(s.engine).hasKeyword(card, "Blocker"),
    );
    expect(recipients).toHaveLength(1);
  });

  it("declares Alliance", () => {
    expect(getCardDefinition("BT23-030")).toMatchObject({
      cardId: "BT23-030",
      nameEn: "Etemon",
      colors: ["Yellow", "Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Puppet", "CS"],
      inheritedEffectText: "＜Alliance＞",
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn pays 1 cost before optionally playing an eligible card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "payMemory", memory: 1 },
      abortOnDecline: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 3,
              nameOrTrait: [
                { tokens: ["Chuumon", "Sukamon"], match: "name" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
            count: 1,
            upTo: true,
          },
          optional: true,
        },
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" } }),
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } }),
      ],
    });
  });

  it("gives the same level 3-or-higher Digimon both Reboot and Blocker", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions[0].actions;
    expect(actions[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Reboot" }, target: { count: 1 } });
    expect(actions[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: 1, sameTarget: true },
      duration: "untilOpponentTurnEnd",
    });
  });

  it("declares inherited Alliance", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Alliance" }],
    });
  });

  it("may decline the play only after paying 1 and still grants both mandatory keywords, per Q5273-Q5274", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-030", as: "etemon" }], hand: [{ card: "BT23-049", as: "eligible" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("etemon"));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Blocker")).toBe(true);
  });
});

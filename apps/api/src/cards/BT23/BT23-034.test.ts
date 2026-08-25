import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-034.js";

describe("BT23-034 Sakuyamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-034")).toMatchObject({
      cardId: "BT23-034",
      nameEn: "Sakuyamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Shaman", "Zaxon", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("pays 5 less with a Zaxon Tamer and applies both riders to one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-086", as: "yuugo" }],
          hand: [{ card: "BT23-034", as: "sakuyamon" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const sakuyamonId = s.inst("sakuyamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sakuyamonId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);

    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("places the deleted card face up at security bottom behind the existing card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-034", as: "sakuyamon" }],
        security: [{ card: "BT1-009", as: "existing" }],
      },
    });
    s.state.turnSeat = 1;
    const sakuyamonId = s.perm("sakuyamon").topCard!.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("sakuyamon").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: sakuyamonId, faceUp: true });
  });

  it("reduces its play cost by 5 when you have a Zaxon Tamer", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("once per turn restricts and weakens one opposing Digimon across all three timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions).toMatchObject([
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          amount: -6000,
          duration: "untilOpponentTurnEnd",
        },
      ]);
    }
  });

  it("places itself face up at the bottom of security on deletion", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any).actions[0];
    expect(action).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
    });
  });

  it("does not reduce the play cost without a Zaxon Tamer", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT23-034", as: "sakuyamon" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakuyamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("sakuyamon").instanceId,
      ),
    );
    expect(s.state.memory).toBe(-1);
  });

  it("accepts off-color level-5 CS evolution and rejects an off-color non-CS peer", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT23-023", as: "base" }],
        hand: [{ card: "BT23-034", as: "sakuyamon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === legal.inst("sakuyamon").instanceId);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: "BT23-034", as: "sakuyamon" }] },
    });
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("sakuyamon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});

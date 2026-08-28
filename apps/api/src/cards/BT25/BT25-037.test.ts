import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_037 } from "./BT25-037.js";
import "../index.js";

describe("BT25-037 Pegasusmon", () => {
  it("matches the printed stats, Armor Purge, and both alternate evolution routes", () => {
    expect(getCardDefinition("BT25-037")).toMatchObject({
      cardId: "BT25-037",
      nameEn: "Pegasusmon",
      colors: ["Yellow", "Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Armor Form"],
      attributes: ["Free"],
      types: ["Holy Beast", "Iliad", "TS"],
    });
    expect(BT25_037.digivolutionRequirement).toEqual([
      { names: ["Patamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
    expect(BT25_037.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Armor Purge", raw: "＜Armor Purge＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_037.effects?.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          amount: 1,
          source: "hand",
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels", "Iliad"], match: "trait" }],
            orFilters: [
              {
                controllerDefault: "mine",
                kind: ["Tamer"],
                nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
              },
            ],
          },
          optional: true,
        },
      ]);
    }
  });

  it.each(["OnPlay", "WhenDigivolving"] as const)(
    "%s adds the top security card to hand, then may place an Angel from hand on top",
    async (trigger) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT25-037", as: "pegasus" }],
            security: [
              { card: "BT1-001", as: "topSecurity" },
              { card: "BT1-002", as: "bottomSecurity" },
            ],
            hand: [
              { card: "BT1-053", as: "angel" },
              { card: "BT24-084", as: "tamer" },
              { card: "BT1-009", as: "nonMatching" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
      );

      await advance(s.engine).fire(
        trigger === "OnPlay" ? EffectTiming.OnPlay : EffectTiming.WhenDigivolving,
        s.perm("pegasus"),
      );
      await settle(() => s.state.players[0]!.security[0]?.instanceId === s.inst("angel").instanceId);

      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
        s.inst("angel").instanceId,
        s.inst("bottomSecurity").instanceId,
      ]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
        s.inst("tamer").instanceId,
        s.inst("nonMatching").instanceId,
        s.inst("topSecurity").instanceId,
      ]);
    },
  );

  it("accepts a TS Tamer as the alternative hand source and can place it at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-037", as: "pegasus" }],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
          hand: [
            { card: "BT24-084", as: "tamer" },
            { card: "BT1-009", as: "nonMatching" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pegasus"));
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("bottomSecurity").instanceId,
      s.inst("tamer").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("nonMatching").instanceId,
      s.inst("topSecurity").instanceId,
    ]);
  });

  it("still activates with zero security and places the specified hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-037", as: "pegasus" }],
          hand: [{ card: "BT24-084", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pegasus"));
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("tamer").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("can decline the optional placement after mandatory security-to-hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-037", as: "pegasus" }],
          security: [{ card: "BT1-001", as: "topSecurity" }],
          hand: [{ card: "BT24-084", as: "tamer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pegasus"));
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("tamer").instanceId,
      s.inst("topSecurity").instanceId,
    ]);
  });

  it("uses Armor Purge to trash Pegasusmon and keep its underlying Digimon in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-037", as: "pegasus", under: ["BT24-020"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("pegasus"), "Armor Purge")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("pegasus").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("pegasus").topCard.cardId === "BT24-020");

    expect(s.perm("pegasus").topCard.cardId).toBe("BT24-020");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-037");
  });

  it("resolves the When Digivolving effect through the TS level-3 alternate route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-033", as: "base" }],
          hand: [
            { card: "BT25-037", as: "pegasus" },
            { card: "BT24-084", as: "tamer" },
          ],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pegasus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("pegasus").instanceId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT24-033"]);
    expect(s.perm("base").topCard.cardId).toBe("BT25-037");
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("tamer").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
  });

  it("resolves the When Digivolving effect through the Patamon alternate route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-048", as: "patamon" }],
          hand: [
            { card: "BT25-037", as: "pegasus" },
            { card: "BT24-084", as: "tamer" },
          ],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("patamon").permanentId,
        instanceId: s.inst("pegasus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("patamon").topCard.instanceId === s.inst("pegasus").instanceId);

    expect(s.perm("patamon").topCard.cardId).toBe("BT25-037");
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("tamer").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
  });
});

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
              { controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
            ],
          },
          optional: true,
        },
      ]);
    }
  });

  it("pays the ordinary yellow level-3 evolution cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-045", as: "yellowBase" }], hand: [{ card: "BT25-037", as: "pegasus" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("pegasus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard?.cardId === "BT25-037");
    expect(s.state.memory).toBe(0);
  });

  it("pays the ordinary black level-3 evolution cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-058", as: "blackBase" }], hand: [{ card: "BT25-037", as: "pegasus" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackBase").permanentId,
        instanceId: s.inst("pegasus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackBase").topCard?.cardId === "BT25-037");
    expect(s.state.memory).toBe(0);
  });

  it("rejects a wrong-color non-TS level-3 source on both alternate routes and ordinary evolution", async () => {
    for (const alternateRequirementIndex of [0, 1]) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT25-037", as: "pegasus" }] },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("redBase").permanentId,
          instanceId: s.inst("pegasus").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex,
        }),
      ).toMatchObject({ ok: false });
    }
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT25-037", as: "pegasus" }] },
    });
    await ordinary.ready();
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("redBase").permanentId,
        instanceId: ordinary.inst("pegasus").instanceId,
      }),
    ).toMatchObject({ ok: false });
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

  it("resolves On Play publicly with the exact play cost and top-security payment", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-037", as: "pegasus" },
            { card: "BT24-084", as: "tamer" },
          ],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pegasus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("topSecurity").instanceId }),
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("tamer").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
  });

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
          deck: ["BT1-010"],
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

  it("publicly deletes when Armor Purge has no payable digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-037", as: "pegasus", suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pegasus").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-037");
  });

  it("refuses Armor Purge after a real battle and trashes the full legal stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-037", as: "pegasus", suspended: true, under: ["BT24-020"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
      },
      { autoAcceptOptional: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pegasus").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("selectCards");
    expect(JSON.parse(decision.payloadJson).candidateInstanceIds).toEqual([s.inst("pegasus").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT25-037", "BT24-020"]),
    );
    expect(s.state.players[0]!.trash.filter((card) => ["BT25-037", "BT24-020"].includes(card.cardId))).toHaveLength(2);
  });

  it.each([
    ["Angel", "BT1-053"],
    ["Archangel", "BT1-060"],
    ["Three Great Angels", "BT1-063"],
    ["Iliad", "BT25-037"],
  ])("accepts the %s Digimon source branch", async (_trait, card) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-037", as: "pegasus" }], hand: [{ card }], security: ["BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("pegasus"));
    expect(s.state.players[0]!.security.map((entry) => entry.cardId)).toEqual([card, "BT1-010"]);
  });

  it("rejects Fallen Angel, TS Option, and TS Tamer boundary errors", async () => {
    for (const card of ["BT11-080", "BT24-090"]) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT25-037", as: "pegasus" }], hand: [{ card }], security: ["BT1-009"] } },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("pegasus"));
      expect(s.state.players[0]!.hand.map((entry) => entry.cardId)).toContain(card);
      expect(s.state.players[0]!.security).toHaveLength(0);
    }
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
          deck: ["BT1-010"],
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
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("topSecurity").instanceId }),
    );
    expect(s.state.memory).toBe(0);
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
          deck: ["BT1-010"],
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
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("topSecurity").instanceId }),
    );
    expect(s.state.memory).toBe(0);
  });

  it("rejects the TS alternate route over a level 3 without TS", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "invalidBase" }], hand: [{ card: "BT25-037", as: "pegasus" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidBase").permanentId,
        instanceId: s.inst("pegasus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("pegasus").instanceId }),
    );
  });
});

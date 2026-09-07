import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-064.js";

type ActionShape = { target: { filter: Record<string, unknown> } };

const actionOf = (trigger: string): ActionShape =>
  compiled.effects.find((entry) => entry.trigger === trigger)!.actions![0] as unknown as ActionShape;

describe("BT23-064 Bakemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-064")).toMatchObject({
      cardId: "BT23-064",
      nameEn: "Bakemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Ghost", "LIBERATOR"],
      effectText:
        "[On Play] [When Digivolving] By deleting 1 of your Digimon, delete 1 of your opponent's level 4 or lower Digimon.",
      inheritedEffectText: "[On Deletion] Gain 1 memory.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("models the By cost and the level gate identically on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = actionOf(trigger);
      expect(action).toMatchObject({
        kind: "Delete",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
        cost: {
          kind: "deleteOwn",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        },
        optional: true,
        abortOnDecline: true,
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
  });

  it("plays for 4 and pays one own Digimon to delete an opposing level 4", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-064", as: "bakemon" }],
          battleArea: [{ card: "BT1-009", as: "fodder" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;
    const fodderId = s.inst("fodder").instanceId;
    const targetId = s.inst("target").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: bakemonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[1]!.trash.some((card) => card.instanceId === targetId),
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([bakemonId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([fodderId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([targetId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("declining the By cost leaves both boards and memory untouched", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-064", as: "bakemon" }],
          battleArea: [{ card: "BT1-009", as: "fodder" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;
    const fodderId = s.inst("fodder").instanceId;
    const targetId = s.inst("target").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: bakemonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard!.instanceId === bakemonId),
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId).sort()).toEqual(
      [bakemonId, fodderId].sort(),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([targetId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("does not pay the cost when the only opposing Digimon is level 5, and never targets your own", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-064", as: "bakemon" }],
          battleArea: [{ card: "BT1-009", as: "ownLevel3" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "tooBig" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;
    const ownLevel3Id = s.inst("ownLevel3").instanceId;
    const tooBigId = s.inst("tooBig").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: bakemonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard!.instanceId === bakemonId),
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId).sort()).toEqual(
      [bakemonId, ownLevel3Id].sort(),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([tooBigId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("digivolves from a purple Lv.3 for 2 and repeats the cost-then-delete", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-064", as: "bakemon" }],
          battleArea: [
            { card: "BT2-067", as: "source" },
            { card: "BT1-009", as: "fodder" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("fodder").topCard!.instanceId);
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;
    const sourceId = s.inst("source").instanceId;
    const fodderId = s.inst("fodder").instanceId;
    const targetId = s.inst("target").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: bakemonId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[1]!.trash.some((card) => card.instanceId === targetId),
    );

    expect(s.state.memory).toBe(3);
    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard!.instanceId === bakemonId);
    expect(evolved).toBeDefined();
    expect(evolved!.stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([fodderId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([targetId]);
  });

  it("refuses to digivolve from an illegal source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-064", as: "bakemon" }],
          battleArea: [{ card: "BT1-009", as: "redSource" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redSource").permanentId,
        instanceId: bakemonId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([bakemonId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("pays its own body when it is your only Digimon, and still deletes the opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-064", as: "bakemon" }] },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;
    const targetId = s.inst("target").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: bakemonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[1]!.trash.some((card) => card.instanceId === targetId),
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([bakemonId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([targetId]);
  });

  it("gains 1 memory when a stack carrying it is deleted as the By cost", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-064", as: "bakemon" }],
          battleArea: [{ card: "BT2-075", under: ["BT23-064"], as: "host" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard!.instanceId);
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;
    const targetId = s.inst("target").instanceId;
    const hostTopId = s.perm("host").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: bakemonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[1]!.trash.some((card) => card.instanceId === targetId),
    );

    // 5 memory - 4 play cost + 1 from the inherited [On Deletion] of the trashed stack.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === hostTopId)).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([bakemonId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not gain memory when Bakemon itself is the deleted top card", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-064", as: "bakemon" }],
          battleArea: [{ card: "BT23-064", as: "fodderBakemon" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("fodderBakemon").topCard!.instanceId);
    await s.ready();
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;
    const fodderId = s.inst("fodderBakemon").instanceId;
    const targetId = s.inst("target").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: bakemonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[1]!.trash.some((card) => card.instanceId === targetId),
    );

    // The inherited [On Deletion] only applies from a digivolution card, never from the top card.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([fodderId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([bakemonId]);
  });

  it("keeps the delete target scoped to Digimon in the battle area", () => {
    const action = actionOf("OnPlay");
    expect(action.target.filter.kind).toEqual(["Digimon"]);
    expect(action.target.filter.controller).toBe("opponent");
  });
});

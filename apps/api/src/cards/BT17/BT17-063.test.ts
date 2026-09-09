import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-063.js";
import "./index.js";

describe("BT17-063 Darcmon", () => {
  it("matches the catalog printed text, evolution costs and requirement", () => {
    expect(getCardDefinition("BT17-063")).toMatchObject({
      cardId: "BT17-063",
      nameEn: "Darcmon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Angel"],
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      inheritedEffectText: "＜Retaliation＞.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["HippoGryphonmon"], cost: 1, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("has Retaliation and draws before trashing one card on digivolution", () => {
    expect(compiled.effects.some((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Retaliation"))).toBe(
      true,
    );
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
    expect(actions?.[1]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
    });
  });

  it("optionally digivolves into Murmukusmon for 2 when HippoGryphonmon is underneath", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[2];
    expect(action).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      costOverride: 2,
      from: ["hand"],
      ignoreRequirements: true,
      optional: true,
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        // Printed [HippoGryphonmon] is an exact name reference, not a substring.
        filter: { nameOrTrait: [{ tokens: ["HippoGryphonmon"], match: "nameExact" }] },
      },
      into: { nameOrTrait: [{ tokens: ["Murmukusmon"], match: "nameExact" }] },
    });
  });

  it("uses the printed [HippoGryphonmon] route for 1 memory and the bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-066", as: "hippoGryphonmon" }],
          hand: [
            { card: "BT17-063", as: "darcmon" },
            { card: "BT1-010", as: "discard" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const darcmonId = s.inst("darcmon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const discardId = s.inst("discard").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hippoGryphonmon").permanentId,
        instanceId: darcmonId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);

    // 3 memory - 1 printed alternate cost; no Murmukusmon in hand, so no chain.
    expect(s.state.memory).toBe(2);
    expect(s.perm("hippoGryphonmon").topCard?.instanceId).toBe(darcmonId);
    expect(s.perm("hippoGryphonmon").stack.map((card) => card.cardId)).toEqual(["BT17-066"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([discardId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
  });

  it("costs 3 on the catalog level-3 Purple route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-061", as: "goblimon" }],
          hand: [
            { card: "BT17-063", as: "darcmon" },
            { card: "BT1-010", as: "discard" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const darcmonId = s.inst("darcmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: darcmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("goblimon").topCard?.instanceId).toBe(darcmonId);
  });

  it("refuses an illegal level-5 off-color source on both routes", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-025", as: "cerberusmon" }],
        hand: [
          { card: "BT17-063", as: "darcmon" },
          { card: "BT1-010", as: "spare" },
        ],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const darcmonId = s.inst("darcmon").instanceId;
    const sourceId = s.perm("cerberusmon").permanentId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: sourceId, instanceId: darcmonId })).not.toEqual({
      ok: true,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: sourceId,
        instanceId: darcmonId,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
    await settle();

    expect(s.perm("cerberusmon").topCard?.cardId).toBe("BT17-025");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === darcmonId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("draws, trashes, and chains the printed Murmukusmon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-066", as: "hippoGryphonmon" }],
          hand: [
            { card: "BT17-063", as: "darcmon" },
            { card: "BT1-010", as: "discard" },
            { card: "BT17-071", as: "murmukusmon" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const murmukusmonId = s.inst("murmukusmon").instanceId;
    const darcmonId = s.inst("darcmon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const discardId = s.inst("discard").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hippoGryphonmon").permanentId,
        instanceId: darcmonId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hippoGryphonmon").topCard?.instanceId === murmukusmonId);

    // 3 - 1 (printed alternate route) - 2 (printed chain cost override).
    expect(s.state.memory).toBe(0);
    expect(s.perm("hippoGryphonmon").stack.map((card) => card.cardId)).toEqual(["BT17-066", "BT17-063"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([discardId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
  });

  it("finds a differently printed HippoGryphonmon deeper in the digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-066", under: ["BT4-044"], as: "hippoGryphonmon" }],
          hand: [
            { card: "BT17-063", as: "darcmon" },
            { card: "BT1-010", as: "discard" },
            { card: "BT17-071", as: "murmukusmon" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const murmukusmonId = s.inst("murmukusmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hippoGryphonmon").permanentId,
        instanceId: s.inst("darcmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hippoGryphonmon").topCard?.instanceId === murmukusmonId);

    expect(s.perm("hippoGryphonmon").stack.map((card) => card.cardId)).toEqual(["BT4-044", "BT17-066", "BT17-063"]);
    expect(s.state.memory).toBe(0);
  });

  it("draws and trashes but does not chain without HippoGryphonmon underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-061", as: "base" }],
          hand: [
            { card: "BT17-063", as: "darcmon" },
            { card: "BT1-010", as: "discard" },
            { card: "BT17-071", as: "murmukusmon" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const drawnId = s.inst("drawn").instanceId;
    const murmukusmonId = s.inst("murmukusmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darcmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);

    expect(s.perm("base").topCard?.cardId).toBe("BT17-063");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual([drawnId, murmukusmonId].sort());
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("has Retaliation on the printed card and grants it to an evolved host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-063", as: "darcmon" },
          { card: "BT17-071", under: ["BT17-063"], as: "host" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("darcmon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});

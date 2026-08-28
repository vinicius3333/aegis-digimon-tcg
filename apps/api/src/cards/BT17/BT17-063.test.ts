import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-063.js";
import "./index.js";

describe("BT17-063 Darcmon", () => {
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
        filter: { nameOrTrait: [{ tokens: ["HippoGryphonmon"], match: "name" }] },
      },
      into: { nameOrTrait: [{ tokens: ["Murmukusmon"], match: "name" }] },
    });
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
    const murmukusmonId = s.inst("murmukusmon").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hippoGryphonmon").permanentId,
        instanceId: s.inst("darcmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hippoGryphonmon").topCard?.instanceId === murmukusmonId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(1);
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
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darcmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT17-063");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-071")).toBe(true);
  });

  it("grants inherited Retaliation to its evolved host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-071", under: ["BT17-063"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});

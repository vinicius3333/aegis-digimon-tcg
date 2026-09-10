import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-062.js";
import "../index.js";

describe("BT26-062 Ghostmon", () => {
  it("matches the catalog and compiles the hand cost, draw, memory, and inherited DP effects", () => {
    expect(getCardDefinition("BT26-062")).toMatchObject({
      nameEn: "Ghostmon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Ghost", "NSo"],
    });
    expect(digivolutionRequirementsFor("BT26-062")).toContainEqual({
      level: 2,
      traits: ["NSo"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects[0]!.actions).toEqual([
      expect.objectContaining({
        kind: "Draw",
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "trash",
          target: {
            count: 1,
            filter: {
              zone: "hand",
              controller: "mine",
              nameOrTrait: [
                { tokens: ["Ghost"], match: "trait" },
                { tokens: ["NSo"], match: "trait" },
              ],
            },
          },
        },
      }),
      expect.objectContaining({ kind: "GainMemory" }),
    ]);
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true });
  });
  it.each([
    ["Ghost-only", "BT20-063"],
    ["NSo-only", "EX8-008"],
  ])("accepts a %s card as the hand-trash cost", async (_label, costCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-062", as: "ghostmon" }],
          hand: [{ card: costCard, as: "cost" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(1);
  });
  it("distinguishes eligible Ghost/NSo costs from an unrelated card in a mixed hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-062", as: "ghostmon" }],
          hand: [
            { card: "BT20-063", as: "ghostCost" },
            { card: "EX8-008", as: "nsoCost" },
            { card: "BT1-009", as: "ineligible" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));

    const trashedIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashedIds).not.toContain(s.inst("ineligible").instanceId);
    expect(
      trashedIds.filter((id) => [s.inst("ghostCost").instanceId, s.inst("nsoCost").instanceId].includes(id)),
    ).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("ineligible").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });
  it("trashes a Ghost card before drawing and gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-062", as: "ghostmon" }],
          hand: [{ card: "BT26-062", as: "cost" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("cost").instanceId }),
    );
  });
  it("may decline the hand-trash payment without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-062", as: "ghostmon" }],
          hand: [{ card: "BT26-062", as: "cost" }],
          deck: [{ card: "BT1-009", as: "top" }],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-062");
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });
  it("does not offer or partially resolve the effect without an eligible cost card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-062", as: "ghostmon" }],
          hand: [{ card: "BT1-009", as: "ineligible" }],
          deck: [{ card: "BT1-010", as: "top" }],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ghostmon"));

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("ineligible").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(0);
  });
  it("digivolves for 0 from an NSo level 2 despite the printed purple cost of 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-006", as: "base" }],
        hand: [{ card: "BT26-062", as: "ghostmon" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ghostmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-062");

    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonNsoBase" }],
        hand: [{ card: "BT26-062", as: "ghostmon" }],
      },
    });
    await invalid.ready();

    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonNsoBase").permanentId,
        instanceId: invalid.inst("ghostmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });
  it("gives its evolution host the inherited 2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-074", as: "host", under: ["BT26-062"] }],
        deck: Array.from({ length: 10 }, () => "BT1-010"),
      },
      1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("expires the inherited DP grant during the opponent's real turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-074", as: "host", under: ["BT26-062"] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { hand: [{ card: "BT1-011", as: "passCard" }], deck: ["BT1-012", "BT1-013"] },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

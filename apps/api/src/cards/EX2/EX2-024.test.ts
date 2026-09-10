import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-024.js";
import "./EX2-024.js";
import "./EX2-060.js";
import "./EX2-066.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-102.js";

// These ordinary main-deck Digimon have no printed or inherited effects. They keep
// draw/security resolution inert while avoiding Digi-Eggs and numeric security forms.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const INERT_SECURITY = ["BT1-009", "BT1-013"];

describe("EX2-024 Sakuyamon", () => {
  it("matches the catalog and typed IR for all printed clauses", () => {
    expect(getCardDefinition("EX2-024")).toMatchObject({
      cardId: "EX2-024",
      nameEn: "Sakuyamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Shaman"],
      effectText:
        "[When Digivolving] Unsuspend 1 of your Digimon, and for each Tamer you have in play, return 1 Option card with [Plug-In] in its name from your trash to your hand.[Your Turn] When you use an Option card with a cost of 2 or more, 1 of your opponent's Digimon gets -3000 DP for the turn.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } },
            {
              kind: "Return",
              to: "hand",
              scaling: {
                per: 1,
                filter: { controller: "mine", kind: ["Tamer"] },
                unit: "cards",
              },
              target: {
                filter: {
                  controller: "mine",
                  zone: "trash",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }],
                },
                count: 1,
              },
            },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenOptionUsed",
              fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
              actions: [
                {
                  kind: "ModifyDP",
                  amount: -3000,
                  duration: "forTheTurn",
                  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("pays 3 to digivolve, draws 1, unsuspends 1 Digimon, and returns one Plug-In per Tamer", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-023", as: "base", suspended: true },
            { card: "EX2-019", as: "ally", suspended: true },
            "EX2-060",
          ],
          hand: [{ card: "EX2-024", as: "evolution" }],
          trash: [{ card: "EX2-066", as: "plugin" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    const baseInstanceId = s.perm("base").topCard.instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "EX2-024" &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId),
    );
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("plugin").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect([s.perm("ally").isSuspended, s.perm("base").isSuspended].filter(Boolean)).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
  });

  it("returns one Plug-In per Tamer while unsuspending only one Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-023", as: "base", suspended: true },
            { card: "EX2-019", as: "ally", suspended: true },
            "EX2-060",
            "EX2-061",
          ],
          hand: [{ card: "EX2-024", as: "evolution" }],
          trash: [
            { card: "EX2-066", as: "pluginA" },
            { card: "EX2-066", as: "pluginB" },
          ],
          deck: FILLER,
          security: INERT_SECURITY,
        },
        1: { deck: FILLER, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.filter((card) => card.cardId === "EX2-066").length === 2,
    );
    expect([s.perm("ally").isSuspended, s.perm("base").isSuspended].filter(Boolean)).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("pluginA").instanceId, s.inst("pluginB").instanceId]),
    );
  });

  it("triggers its Option effect after a cost-2 use and not a cheaper use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-024", as: "sakuyamon" }],
          hand: [
            { card: "BT4-104", as: "cheap" },
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
          security: INERT_SECURITY,
          deck: FILLER,
        },
        1: {
          battleArea: [{ card: "EX2-014", as: "target", dp: 10000 }],
          deck: FILLER,
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-104"));
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.perm("target").currentDP).toBe(4000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("triggers when Rika uses a qualifying Plug-In without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-024", as: "sakuyamon" },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "EX2-066", as: "plugin" }],
          deck: FILLER,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "EX2-014", as: "target", dp: 10000 }],
          deck: FILLER,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("plugin").instanceId) &&
        s.perm("target").currentDP === 7000,
    );
    expect(s.state.memory).toBe(10);
    expect(s.perm("rika").isSuspended).toBe(true);
  });

  it("rejects evolution from a non-yellow source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-024", as: "evolution" }],
        deck: FILLER,
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});

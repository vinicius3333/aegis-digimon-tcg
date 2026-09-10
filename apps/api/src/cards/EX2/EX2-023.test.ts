import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-023.js";
import "./EX2-023.js";
import "./EX2-021.js";
import "./EX2-014.js";
import "./EX2-060.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT1/BT1-012.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-014.js";
import "../BT1/BT1-080.js";
import "../BT1/BT1-108.js";
import "../BT1/BT1-109.js";
import "../P/P-095.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-023 Taomon", () => {
  it("matches the catalog and compiled IR for its main and inherited clauses", () => {
    expect(getCardDefinition("EX2-023")).toMatchObject({
      cardId: "EX2-023",
      nameEn: "Taomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Wizard"],
      effectText: "[When Digivolving] You may play 1 [Rika Nonaka] from your hand without paying its memory cost.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, 1 of your opponent's Digimon gets -2000 DP for the turn.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rika Nonaka"], match: "name" }] },
                count: 1,
              },
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenOptionUsed",
              fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                  amount: -2000,
                  duration: "forTheTurn",
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

  it("plays Rika Nonaka from hand without paying her cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "base" }],
          hand: [
            { card: "EX2-023", as: "evolution" },
            { card: "EX2-060", as: "rika" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rika").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rika").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").topCard.cardId).toBe("EX2-023");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-021"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("honors the may clause when the controller declines playing Rika", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-021", as: "base" }],
          hand: [
            { card: "EX2-023", as: "evolution" },
            { card: "EX2-060", as: "rika" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: inertSecurity,
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").topCard.cardId).toBe("EX2-023");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rika").instanceId)).toBe(true);
  });

  it("rejects evolution from a non-yellow level-4 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-023", as: "evolution" }],
        deck: ["BT1-011", "BT1-012"],
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("triggers its inherited Option effect only after a cost-2 use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-023"] }],
          hand: [
            { card: "BT1-108", as: "cheap" },
            { card: "BT1-109", as: "option1" },
            { card: "BT1-109", as: "option2" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("target").currentDP).toBe(12000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-108"));
    expect(s.perm("target").currentDP).toBe(12000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-109").length === 1);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-109").length === 2);
    expect(s.perm("target").currentDP).toBe(10000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(12000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("triggers the inherited effect after a public unpaid Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-029", as: "host", under: ["EX2-023"] },
            { card: "EX2-023", as: "taomon" },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "P-095", as: "plugin" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("taomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rika").isSuspended);
    expect(s.perm("rika").isSuspended).toBe(true);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "P-095"));
    expect(s.state.memory).toBe(10);
    expect(s.perm("target").currentDP).toBe(4000);
  });
});

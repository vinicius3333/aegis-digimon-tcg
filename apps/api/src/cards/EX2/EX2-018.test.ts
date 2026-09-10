import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-018.js";
import "../index.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-018 MarineAngemon", () => {
  it("matches the catalog and compiles its source-free recovery", () => {
    expect(getCardDefinition("EX2-018")).toMatchObject({
      cardId: "EX2-018",
      nameEn: "MarineAngemon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Fairy"],
      effectText:
        "[On Play] For each of your opponent's Digimon with no digivolution cards, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.) This effect can't increase the number of cards in your security stack to 6 or more.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              maxSecurity: 5,
              scaling: {
                per: 1,
                unit: "cards",
                filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("recovers once for each opposing source-free Digimon and ignores sourced Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-018", as: "marine" }],
          deck: [{ card: "BT1-011", as: "recovered1" }, { card: "BT1-012", as: "recovered2" }, "BT1-013"],
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "sourceFree1" },
            { card: "EX2-019", as: "sourceFree2" },
            { card: "EX2-019", as: "withSource", under: ["EX2-013"] },
          ],
          security: ["BT1-014"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("recovered1").instanceId, s.inst("recovered2").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013"]);
  });

  it("does not recover when every opposing Digimon has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-018", as: "marine" }],
          deck: [{ card: "BT1-011", as: "recovered" }],
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "EX2-014", under: ["EX2-013"] },
            { card: "EX2-019", under: ["EX2-013"] },
          ],
          security: ["BT1-014"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("recovered").instanceId]);
  });

  it("caps recovery at 5 security even when more source-free Digimon qualify (Q3304)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-018", as: "marine" }],
          deck: [{ card: "BT1-011", as: "recovered" }, "BT1-012"],
          security: ["BT1-009", "BT1-010", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: ["EX2-014", "EX2-019", "EX2-020", { card: "EX2-019", under: ["EX2-013"] }],
          security: ["BT1-014"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.security.length === 5);
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not recover when already at 5 security (Q3304)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-018", as: "marine" }],
          deck: [{ card: "BT1-011", as: "recovered" }, "BT1-012"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: { battleArea: ["EX2-014", "EX2-019"], security: ["BT1-014"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("recovered").instanceId,
      expect.any(String),
    ]);
  });

  it("supports legal yellow level-5 evolution with paid cost, stack identity, and draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "source" }],
          hand: [{ card: "EX2-018", as: "evolution" }],
          deck: [{ card: "BT1-014", as: "draw" }],
          security: inertSecurity,
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX2-018");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-057"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw").instanceId);
  });

  it("rejects evolution from a non-blue/non-yellow level-5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-062", as: "blackSource" }],
        hand: [{ card: "EX2-018", as: "evolution" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});

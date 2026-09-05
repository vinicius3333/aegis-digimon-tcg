import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-012.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-012", () => {
  it("uses the exact MetalGreymon alternate route at cost 1 and rejects a near-name level-five", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-021", as: "base" }], hand: [{ card: "EX9-012", as: "evo" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(1);
  });
  it("rejects Alterous Mode as a near-name card for the exact MetalGreymon route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-012", as: "base" }], hand: [{ card: "EX9-012", as: "evo" }] },
    });
    s.state.memory = 2;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evo").instanceId,
      alternateRequirementIndex: 0,
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.cardId).toBe("EX9-012");
  });
  it("grants inherited +4000 on a real legal evolution and removes it on the opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-012", as: "host" }],
        hand: [{ card: "ST1-10", as: "evo" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("ST1-10");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-012"]);
    expect(s.perm("host").currentDP).toBe(16000);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(12000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes an opposing Digimon up to 8000 DP on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 8000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { dp: { op: "lte", value: 8000 } } },
    });
  });
  it("during your turn digivolves into Greymon after Garurumon/Tai and into Greymon after another Garurumon digivolves", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Digivolve", payCost: false }] },
      { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "Digivolve", payCost: false }] },
    ]));

  it("deletes an opposing Digimon at the printed 8000 DP boundary on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-012", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "overCeiling", dp: 9000 },
            { card: "BT1-009", as: "target", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("overCeiling").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-012"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes an opposing Digimon at 8000 DP on a real When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-009", as: "host" }],
          hand: [{ card: "EX9-012", as: "evo" }],
          deck: ["BT1-048"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("EX9-012");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-009"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("free-digivolves into a Greymon after a real Tai Kamiya play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-012", as: "source" }],
          hand: [
            { card: "ST1-12", as: "tai" },
            { card: "BT5-069", as: "greymon" },
          ],
          deck: ["BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tai").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("source").topCard?.cardId).toBe("BT5-069");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST1-12")).toBe(true);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-012"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("free-digivolves into a Greymon after a real Digimon digivolves into Garurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-012", as: "source" },
            { card: "EX9-016", as: "garurumonHost" },
          ],
          hand: [
            { card: "P-007", as: "garurumon" },
            { card: "BT5-069", as: "greymon" },
          ],
          deck: ["BT1-048", "BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("garurumonHost").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("garurumonHost").topCard?.cardId).toBe("P-007");
    expect(s.perm("source").topCard?.cardId).toBe("BT5-069");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-012"]);
    expect(s.perm("garurumonHost").stack.map(({ cardId }) => cardId)).toEqual(["EX9-016"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-046"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not free-digivolve on an opponent's Garurumon play during their turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-012", as: "source" }], hand: [{ card: "BT5-069", as: "greymon" }] },
        1: { hand: [{ card: "ST2-06", as: "garurumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST2-06"));

    expect(s.perm("source").topCard?.cardId).toBe("EX9-012");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT5-069"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not react when an opponent owns the EX9-012 source during your turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST2-06", as: "garurumon" }] },
        1: { battleArea: [{ card: "EX9-012", as: "source" }], hand: [{ card: "BT5-069", as: "greymon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST2-06"));

    expect(s.perm("source").topCard?.cardId).toBe("EX9-012");
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT5-069"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q4754 excludes EX9-012 itself from the Garurumon evolution follow-up", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-012", as: "source" }],
          hand: [
            { card: "ST21-11", as: "garurumon" },
            { card: "EX4-074", as: "greymon" },
          ],
          deck: ["BT1-048", "BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("garurumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("source").topCard?.cardId).toBe("ST21-11");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-012"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX4-074", "BT1-048"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    // The remaining Greymon is a legal evolution, so lack of a candidate cannot explain the refusal.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX4-074");
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-012", "ST21-11"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-046"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { played: "ST2-06", decline: false, evolves: true, memory: 5 },
    { played: "ST2-06", decline: true, evolves: false, memory: 5 },
    { played: "BT1-009", decline: false, evolves: false, memory: 8 },
  ])("resolves real $played play with decline=$decline", async ({ played, decline, evolves, memory }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-012", as: "source" }],
          hand: [
            { card: played, as: "played" },
            { card: "BT5-069", as: "greymon" },
          ],
          deck: ["BT1-048"],
        },
      },
      { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe(evolves ? "BT5-069" : "EX9-012");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(evolves ? ["EX9-012"] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(evolves ? ["BT1-048"] : ["BT5-069"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(evolves ? [] : ["BT1-048"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

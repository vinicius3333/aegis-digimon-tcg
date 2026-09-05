import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function sourceBoard() {
  // A hand-laid six-color source stack keeps these focused tests about EX9-074's
  // target assignment. The public evolution path is covered by the primary suite.
  return {
    battleArea: [{ card: "BT16-021", as: "kimeramon", under: ["BT10-059", "BT10-009", "BT16-040"] }],
    hand: [{ card: "EX9-074", as: "evo" }],
    deck: ["BT1-048"],
  };
}

async function digivolve(s: ReturnType<typeof setupEngine>) {
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("kimeramon").permanentId,
      instanceId: s.inst("evo").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle();
  expect(s.perm("kimeramon").topCard.cardId).toBe("EX9-074");
  expect(s.perm("kimeramon").stack.map((card) => card.cardId)).toEqual([
    "BT10-059",
    "BT10-009",
    "BT16-040",
    "BT16-021",
  ]);
  expect(s.perm("kimeramon").currentDP).toBe(16000);
  expect(s.state.pendingDecision).toBeUndefined();
}

async function makeDynamicColorTarget(s: ReturnType<typeof setupEngine>) {
  s.state.memory = 20;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
  await settle();
}

describe("EX9-074 six-color digivolution stack", () => {
  it("reaches six visible source colors through two real BT8-084 cycles", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-021", as: "host", under: ["BT16-040"] }],
          hand: [
            { card: "BT8-084", as: "first" },
            { card: "BT8-084", as: "second" },
            { card: "EX9-074", as: "evo" },
          ],
          trash: ["BT10-009", "BT10-059"],
          deck: ["BT1-048", "BT1-046", "BT1-010", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT10-009", as: "opponentHost", dp: 100000 },
            { card: "BT10-059", as: "stripperOne", dp: 100000 },
            { card: "BT10-059", as: "stripperTwo", dp: 100000 },
            { card: "BT1-009", dp: 100000 },
            { card: "BT1-027", dp: 100000 },
            { card: "BT1-045", dp: 100000 },
            { card: "BT1-064", dp: 100000 },
            { card: "BT10-058", dp: 100000 },
            { card: "BT10-071", dp: 100000 },
            { card: "BT1-084", dp: 100000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const stripperOne = s.perm("stripperOne");
    const stripperTwo = s.perm("stripperTwo");

    s.state.memory = 20;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("first").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT10-009", "BT16-040", "BT16-021"]);
    await advance(s.engine).fire(EffectTiming.OnPlay, stripperOne);
    expect(s.perm("host").topCard?.cardId).toBe("BT16-021");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT10-009", "BT16-040"]);

    s.state.memory = 20;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("second").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT10-059", "BT10-009", "BT16-040", "BT16-021"]);
    await advance(s.engine).fire(EffectTiming.OnPlay, stripperTwo);
    expect(s.perm("host").topCard?.cardId).toBe("BT16-021");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT10-059", "BT10-009", "BT16-040"]);

    s.state.memory = 20;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard?.cardId).toBe("EX9-074");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT10-059", "BT10-009", "BT16-040", "BT16-021"]);
    expect(s.perm("host").currentDP).toBe(16000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT10-009"]);
    expect(s.state.players[1]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(["BT10-059", "BT10-059"]);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-046", "BT1-010"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses effective target colors when the opponent's Digimon color was changed (Q5003)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-074",
              as: "source",
              under: ["BT1-009", "BT1-027", "BT1-045", "BT1-064", "BT10-058", "BT10-071"],
            },
          ],
          hand: [{ card: "BT11-043", as: "king" }],
          trash: ["BT11-040", "BT11-040", "BT11-040"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "changed" },
            { card: "BT1-009", as: "red" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await makeDynamicColorTarget(s);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses effective target colors for the ordinary matching-color branch (Q5003)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-074", as: "source", under: ["BT1-084"] }],
          hand: [{ card: "BT11-043", as: "king" }],
          trash: ["BT11-040", "BT11-040", "BT11-040"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "changed" }] },
      },
      { autoSelectCards: true },
    );
    await makeDynamicColorTarget(s);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("publishes every choice that preserves the maximum distinct-color assignment", async () => {
    const s = setupEngine(
      {
        0: sourceBoard(),
        1: {
          battleArea: [
            { card: "BT11-018", as: "dual" },
            { card: "BT1-009", as: "red" },
            { card: "BT1-027", as: "blue" },
          ],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kimeramon").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));
    const firstChoice = [...s.decisions].reverse().find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(firstChoice?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("dual").permanentId, s.perm("red").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstChoice!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("red").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseTargets").length >= 2);
    const secondChoice = [...s.decisions].reverse().find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(secondChoice?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("dual").permanentId, s.perm("blue").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondChoice!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("blue").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT11-018"]);
  });

  it("cannot spend the red/blue target on red and leave the red target alive (Q5005)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: sourceBoard(),
        1: {
          battleArea: [
            { card: "BT11-018", as: "dual" },
            { card: "BT1-009", as: "red" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("dual").topCard!.instanceId);
    await digivolve(s);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("checks all seven opponent colors after reaching six source colors (Q5003)", async () => {
    const s = setupEngine(
      {
        0: sourceBoard(),
        1: {
          battleArea: [
            { card: "BT1-009", as: "red" },
            { card: "BT1-027", as: "blue" },
            { card: "BT1-045", as: "yellow" },
            { card: "BT1-064", as: "green" },
            { card: "BT10-058", as: "black" },
            { card: "BT10-071", as: "purple" },
            // Q5003 checks white too, although this six-color source stack has no white card.
            { card: "BT1-084", as: "white" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await digivolve(s);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses a single-color Digimon before a multicolor Digimon for the same color", async () => {
    const s = setupEngine(
      {
        0: sourceBoard(),
        1: {
          battleArea: [
            { card: "BT11-018", as: "redBlue" },
            { card: "BT1-009", as: "red" },
            { card: "BT1-027", as: "blue" },
            { card: "BT1-045", as: "yellow" },
            { card: "BT1-064", as: "green" },
            { card: "BT10-058", as: "black" },
            { card: "BT10-071", as: "purple" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await digivolve(s);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT11-018"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

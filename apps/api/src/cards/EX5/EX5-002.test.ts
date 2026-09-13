import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-002.js";
import "../index.js";

describe("EX5-002 Moonmon", () => {
  it("encodes the inherited once-per-turn Tamer-triggered evolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Light Fang"] }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              optional: true,
              into: { controllerDefault: "mine", kind: ["Digimon"] },
              target: { filter: { isSelfRef: true }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it.each([
    { tamer: "EX5-065", cost: 3, trait: "Night Claw" },
    { tamer: "EX5-064", cost: 4, trait: "Light Fang" },
  ])("pays the normal evolution cost after playing a $trait Tamer", async ({ tamer, cost }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: ["EX5-002"] }],
          hand: [
            { card: tamer, as: "tamer" },
            { card: "BT1-032", as: "evolution" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-032", 500);

    expect(s.perm("host").topCard?.cardId).toBe("BT1-032");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-002", "BT1-029"]);
    expect(s.state.memory).toBe(10 - cost - 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("allows declining the optional evolution without consuming the hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: ["EX5-002"] }],
          hand: [
            { card: "EX5-065", as: "tamer" },
            { card: "BT1-032", as: "evolution" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks(300);

    expect(s.perm("host").topCard?.cardId).toBe("BT1-029");
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-032"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { tamer: "BT1-087", candidate: "BT1-032", reason: "unrelated Tamer" },
    { tamer: "EX5-065", candidate: "BT1-014", reason: "illegal evolution requirement" },
  ])("does not evolve when the trigger is a $reason", async ({ tamer, candidate }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: ["EX5-002"] }],
          hand: [
            { card: tamer, as: "tamer" },
            { card: candidate, as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks(300);

    expect(s.perm("host").topCard?.cardId).toBe("BT1-029");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([candidate]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not react when the matching Tamer is played during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: ["EX5-002"] }],
          hand: [{ card: "BT1-032", as: "candidate" }],
        },
        1: { hand: [{ card: "EX5-065", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("BT1-029");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-032"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("only evolves the Moonmon-bearing stack when a peer Digi-Egg shares the board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "moonHost", under: ["EX5-002"] },
            { card: "BT1-029", as: "peerHost", under: ["EX5-001"] },
          ],
          hand: [
            { card: "EX5-065", as: "tamer" },
            { card: "BT1-032", as: "moonEvolution" },
            { card: "BT1-032", as: "peerEvolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("moonHost").topCard?.cardId === "BT1-032", 500);

    expect(s.perm("moonHost").topCard?.cardId).toBe("BT1-032");
    expect(s.perm("moonHost").stack.map((card) => card.cardId)).toEqual(["EX5-002", "BT1-029"]);
    expect(s.perm("peerHost").topCard?.cardId).toBe("BT1-029");
    expect(s.perm("peerHost").stack.map((card) => card.cardId)).toEqual(["EX5-001"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-032"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("keeps one physical Moonmon OPT spent for the turn and resets it on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: [{ card: "EX5-002", as: "moonmon" }] }],
          hand: [
            { card: "EX5-065", as: "firstTamer" },
            { card: "EX5-065", as: "secondTamer" },
            { card: "EX5-065", as: "thirdTamer" },
            { card: "BT1-032", as: "firstEvolution" },
            { card: "BT1-040", as: "secondEvolution" },
          ],
          deck: Array.from({ length: 12 }, () => "BT1-009"),
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-032");
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("firstEvolution").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("moonmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks(300);
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("firstEvolution").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("moonmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondEvolution").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("secondEvolution").instanceId);
    expect(s.perm("host").topCard?.cardId).toBe("BT1-040");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-002", "BT1-029", "BT1-032"]);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("moonmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondEvolution").instanceId)).toBe(
      false,
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

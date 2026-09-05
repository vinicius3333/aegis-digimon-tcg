import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-040.js";

const mainEffect =
  "[Your Turn] When you would play a green Digimon card, by suspending this Digimon, reduce the cost by 1.";
const inheritedEffect =
  "[Your Turn][Once Per Turn] When an effect suspends one of your Digimon, suspend 1 of your opponent's Digimon.";

describe("EX3-040 Parasaurmon", () => {
  it("has the official identity and printed green evolution requirement", () => {
    expect(getCardDefinition("EX3-040")).toMatchObject({
      cardId: "EX3-040",
      nameEn: "Parasaurmon",
      colors: ["Green"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dinosaur"],
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "EX3-040",
    });
  });

  it("digivolves from a green level 3 for its printed cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "EX3-040", as: "parasaurmon" }],
        deck: ["BT1-003"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("parasaurmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-040");

    expect(s.state.memory).toBe(0);
  });

  it("offers its correctly attributed suspend cost and reduces a green Digimon's play cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-040", as: "parasaurmon" }],
          hand: [{ card: "BT1-064", as: "greenDigimon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-064"));

    expect(s.perm("parasaurmon").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(1);
    expect(s.decisions.find(({ req }) => req.sourceCardId === "EX3-040")?.req).toMatchObject({
      kind: "optional",
      promptText: "Suspend Parasaurmon to reduce this green Digimon's play cost by 1?",
      sourceCardId: "EX3-040",
      options: { timing: "YourTurn", effectText: mainEffect },
    });
  });

  it("pays the full cost and leaves Parasaurmon ready when the player declines", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-040", as: "parasaurmon" }],
          hand: [{ card: "BT1-064", as: "greenDigimon" }],
        },
      },
      {},
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-064") && s.state.memory === 1,
    );

    expect(s.perm("parasaurmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("does not offer the reducer for a non-green Digimon or while Parasaurmon is suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-040", suspended: true, as: "parasaurmon" }],
        hand: [
          { card: "BT1-029", as: "blueDigimon" },
          { card: "BT1-064", as: "greenDigimon" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-029"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-064"));

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  it("does not offer the reducer for a blue Digimon while Parasaurmon is ready", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-040", as: "parasaurmon" }],
        hand: [{ card: "BT1-029", as: "blueDigimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blueDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-029"));

    expect(s.perm("parasaurmon").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(0);
  });

  it("does not reduce the opponent's green Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-040", as: "parasaurmon" }] },
      1: { hand: [{ card: "BT1-064", as: "opponentGreenDigimon" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("opponentGreenDigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-064"));

    expect(s.perm("parasaurmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(8);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(0);
  });

  it("does not reduce green Tamer or Option play costs", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-040", as: "parasaurmon" }],
        hand: [
          { card: "BT1-088", as: "greenTamer" },
          { card: "BT1-108", as: "greenOption" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-088"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-108"));

    expect(s.perm("parasaurmon").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(0);
    expect(s.state.memory).toBe(7);
  });

  it("allows two ready copies to pay independently and reduce the same play by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-040", as: "first" },
            { card: "EX3-040", as: "second" },
          ],
          hand: [{ card: "BT1-064", as: "greenDigimon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-064"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(2);
  });

  it("cannot pay the reducer with a Parasaurmon that can't be suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-040", as: "parasaurmon" }],
          hand: [{ card: "BT1-064", as: "greenDigimon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("parasaurmon").permanentId,
      "beSuspended",
      EffectDuration.Permanent,
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-064"));

    expect(s.perm("parasaurmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(0);
  });

  it("Dinosaur family: inherited effect observes an effect suspending another own Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-040"], as: "host" },
            { card: "EX3-040", as: "dinosaurAlly" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-029", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("dinosaurAlly").permanentId]);
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("untouched").isSuspended).toBe(false);
    expect(s.decisions.find(({ req }) => req.sourceCardId === "EX3-040")?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-040",
      options: { timing: "YourTurn", effectText: inheritedEffect, min: 1, max: 1 },
    });
  });

  it("inherited effect ignores opposing/rule suspension and fires only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-040"], as: "host" },
            { card: "EX3-040", as: "firstAlly" },
            { card: "EX3-040", as: "secondAlly" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
            { card: "BT1-030", as: "opposingSource" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opposingSource").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("firstAlly").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended);
    await advance(s.engine).verb.suspend([s.perm("secondAlly").permanentId]);
    await settle();

    expect(s.perm("firstTarget").isSuspended).toBe(true);
    expect(s.perm("secondTarget").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(1);
  });

  it("inherited effect responds when an opponent's effect suspends an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-040"], as: "host" },
            { card: "EX3-040", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId], 1);
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("offers only active opposing Digimon while keeping suspended targets visible", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-041", under: ["EX3-040"], as: "host" },
          { card: "EX3-040", as: "ally" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "firstActive" },
          { card: "BT1-030", as: "secondActive" },
          { card: "BT1-029", suspended: true, as: "alreadySuspended" },
        ],
      },
    });
    await s.ready();

    const suspension = advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-040",
      options: {
        candidateInstanceIds: expect.arrayContaining([
          s.perm("firstActive").permanentId,
          s.perm("secondActive").permanentId,
        ]),
        visibleInstanceIds: expect.arrayContaining([
          s.perm("firstActive").permanentId,
          s.perm("secondActive").permanentId,
          s.perm("alreadySuspended").permanentId,
        ]),
        min: 1,
        max: 1,
      },
    });
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).toHaveLength(2);
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).not.toContain(s.perm("alreadySuspended").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("firstActive").permanentId] },
      }),
    ).toEqual({ ok: true });
    await suspension;
  });

  it("does not activate inherited for the first time during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-041", under: ["EX3-040"], as: "host" },
          { card: "EX3-040", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "target" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId], 1);
    await settle();

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(0);
  });

  it("resets inherited once per turn on the controller's next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-040"], as: "host" },
            { card: "EX3-040", as: "firstAlly" },
            { card: "EX3-040", as: "blockedAlly" },
            { card: "EX3-040", as: "nextTurnAlly" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "blockedTarget" },
            { card: "BT1-030", as: "nextTurnTarget" },
          ],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("nextTurnTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("firstAlly").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended);
    await advance(s.engine).verb.suspend([s.perm("blockedAlly").permanentId]);
    await settle();
    expect(s.perm("blockedTarget").isSuspended).toBe(false);

    const firstTurn = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    expect(s.state.turnCount).toBeGreaterThan(firstTurn);
    s.perm("firstTarget").isSuspended = true;
    s.perm("blockedTarget").isSuspended = true;
    s.perm("nextTurnAlly").isSuspended = false;
    await advance(s.engine).verb.suspend([s.perm("nextTurnAlly").permanentId]);
    await settle(() => s.perm("nextTurnTarget").isSuspended);

    expect(s.perm("nextTurnTarget").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(1);
  });

  it("lets two inherited copies trigger independently after repeated recomputation", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-041", under: ["EX3-040"], as: "firstHost" },
            { card: "EX3-041", under: ["EX3-040"], as: "secondHost" },
            { card: "EX3-040", as: "ally" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended && s.perm("secondTarget").isSuspended);

    expect(s.perm("firstTarget").isSuspended).toBe(true);
    expect(s.perm("secondTarget").isSuspended).toBe(true);
    expect(observe(s.engine).subscriptions("whenEffectSuspends")).toHaveLength(2);
    const ex3040Decisions = s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040");
    // Both copies watch the same event, so they are simultaneous triggers of one player and
    // the controller picks which resolves first before either body asks for its target.
    expect(ex3040Decisions.map(({ req }) => req.kind)).toEqual(["orderTriggers", "chooseTargets"]);
  });

  it("does not open an impossible inherited prompt without an opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-041", under: ["EX3-040"], as: "host" },
          { card: "EX3-040", as: "ally" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-040")).toHaveLength(0);
  });
});

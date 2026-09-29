import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT14/BT14-041.js";
import "../BT4/BT4-097.js";
import "../EX1/EX1-029.js";
import "../ST2/ST2-12.js";
import "./BT1-087.js";

describe("BT1-087 T.K. Takaishi", () => {
  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-087", as: "takeru" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("takeru"));
    expect(s.state.memory).toBe(3);
  });

  it("does not lower memory already at 3 and does not apply during the opponent's turn", async () => {
    const atThree = setupEngine({ 0: { battleArea: [{ card: "BT1-087", as: "takeru" }] } });
    atThree.state.memory = 3;
    await advance(atThree.engine).fire(EffectTiming.OnStartTurn, atThree.perm("takeru"));
    expect(atThree.state.memory).toBe(3);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: "BT1-087", as: "takeru" }] } });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 1;
    await advance(opponentTurn.engine).fire(EffectTiming.OnStartTurn, opponentTurn.perm("takeru"));
    expect(opponentTurn.state.memory).toBe(1);
  });

  it("chooses a yellow card from security, adds it to hand, then recovers from deck", async () => {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-087", as: "takeru" }],
          security: [
            { card: "BT1-009", as: "topRed" },
            { card: "BT1-087", as: "yellowChoice" },
          ],
          deck: [{ card: "BT1-010", as: "recovery" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredSelection },
    );
    const player = s.state.players[0] as PlayerState;
    const yellowChoiceId = s.inst("yellowChoice").instanceId;
    const recoveryId = s.inst("recovery").instanceId;
    preferredSelection.push(yellowChoiceId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === yellowChoiceId) &&
        player.security.some((card) => card.instanceId === recoveryId),
    );

    expect(player.hand.some((card) => card.instanceId === yellowChoiceId)).toBe(true);
    expect(player.security.some((card) => card.instanceId === yellowChoiceId)).toBe(false);
    expect(player.security.some((card) => card.instanceId === recoveryId)).toBe(true);
    expect(player.security).toHaveLength(2);
    expect(player.deck).toHaveLength(0);
  });

  it("reveals every security card with its identity and recovers the deck top without a second selection", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-087", as: "takeru" }],
        security: [
          { card: "BT1-009", as: "redChoice" },
          { card: "BT1-087", as: "yellowChoice" },
        ],
        deck: [{ card: "BT1-010", as: "recovery" }, "BT1-011"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("takeru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const pending = s.state.pendingDecision!;
    const payload = JSON.parse(pending.payloadJson) as {
      candidateInstanceIds?: string[];
      visibleCards?: Array<{ instanceId: string; cardId: string }>;
    };
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("redChoice").instanceId, s.inst("yellowChoice").instanceId]),
    );
    expect(payload.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("redChoice").instanceId, cardId: "BT1-009" },
        { instanceId: s.inst("yellowChoice").instanceId, cardId: "BT1-087" },
      ]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("yellowChoice").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("adds a non-yellow security card without recovering, then shuffles security (Q952)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-087", as: "takeru" }],
          security: [
            { card: "BT1-009", as: "redChoice" },
            { card: "BT1-087", as: "yellow" },
          ],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("redChoice").instanceId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redChoice").instanceId));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("yellow").instanceId);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
  });

  it("does nothing on play when the security stack is empty", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-087", as: "takeru" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("takeru").instanceId),
    );

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-087", as: "securityTk", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTk"));

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityTk").instanceId,
      ),
    ).toBe(true);
  });
});

describe("BT1-087 T.K. Takaishi — KB Q&A rulings", () => {
  async function memoryAfterStartOfTurn(preferredFirst: string): Promise<number> {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-087", "ST2-12"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-011"],
        },
        1: { battleArea: ["ST2-03"], deck: ["BT1-009"], security: ["BT1-009"] },
      },
      { preferTriggerKeys: [preferredFirst] },
    );
    s.state.memory = 1;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memory = s.state.memory;
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    return memory;
  }

  interface TakeruPlayOptions {
    battleArea?: PermanentSpec[];
    opponentBattleArea?: PermanentSpec[];
    chooseYellow: boolean;
  }

  async function playTakeru({ battleArea, opponentBattleArea, chooseYellow }: TakeruPlayOptions) {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea,
          hand: [{ card: "BT1-087", as: "takeru" }],
          security: [
            { card: "BT1-009", as: "redChoice" },
            { card: "BT1-087", as: "yellowChoice" },
          ],
          deck: [{ card: "BT1-010", as: "recovery" }],
        },
        1: { battleArea: opponentBattleArea },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferredSelection },
    );
    const choice = s.inst(chooseYellow ? "yellowChoice" : "redChoice").instanceId;
    preferredSelection.push(choice);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === choice));
    await settle(() => s.state.pendingDecision === undefined);
    return s;
  }

  it("lets the player resolve T.K. before ST2-12 Matt to go from 1 memory to 4 (Q950)", async () => {
    expect(await memoryAfterStartOfTurn("BT1-087")).toBe(4);
    expect(await memoryAfterStartOfTurn("ST2-12")).toBe(3);
  });

  it("shows every security card only to its owner, then reveals just the chosen card (Q951)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-087", as: "takeru" }],
          security: [
            { card: "BT1-009", as: "red" },
            { card: "BT1-087", as: "yellow" },
            { card: "BT1-027", as: "blue" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const securityIds = ["red", "yellow", "blue"].map((alias) => s.inst(alias).instanceId);
    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")!;
    expect(selection.seat).toBe(0);
    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as {
      candidateInstanceIds?: string[];
      visibleCards?: Array<{ instanceId: string }>;
    };
    expect(payload.visibleCards?.map((card) => card.instanceId).sort()).toEqual([...securityIds].sort());
    expect(payload.candidateInstanceIds?.sort()).toEqual([...securityIds].sort());
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("blue").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blue").instanceId));

    const reveals = s.events.filter((event) => event.kind === "cardRevealed");
    expect(reveals).toEqual([expect.objectContaining({ seat: 0, cardId: "BT1-027", sourceCardId: "BT1-087" })]);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("still lets BT4-097 Kari suspend for 1 memory when T.K.'s recovery refills security (Q1250)", async () => {
    const s = await playTakeru({ battleArea: [{ card: "BT4-097", as: "kari" }], chooseYellow: true });

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("still triggers BT14-041 Seraphimon's -7000 DP and Security A. +1 when T.K.'s recovery refills security (Q2414)", async () => {
    const yellow = await playTakeru({
      battleArea: [{ card: "BT14-041", as: "seraph" }],
      opponentBattleArea: [{ card: "BT14-026", as: "target", dp: 8000 }],
      chooseYellow: true,
    });
    await settle(() => yellow.perm("target").currentDP === 1000);
    expect(yellow.state.players[0]!.security).toHaveLength(2);
    expect(yellow.perm("target").currentDP).toBe(1000);
    expect(observe(yellow.engine).keywordAmount(yellow.perm("seraph"), "SecurityAttack")).toBe(1);

    const red = await playTakeru({
      battleArea: [{ card: "BT14-041", as: "seraph" }],
      opponentBattleArea: [{ card: "BT14-026", as: "target", dp: 8000 }],
      chooseYellow: false,
    });
    expect(red.perm("target").currentDP).toBe(8000);
    expect(observe(red.engine).keywordAmount(red.perm("seraph"), "SecurityAttack")).toBe(0);
  });

  it("still gains 1 memory from inherited EX1-029 MagnaAngemon when T.K.'s recovery refills security (Q3213)", async () => {
    const yellow = await playTakeru({
      battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }],
      chooseYellow: true,
    });
    expect(yellow.state.players[0]!.security).toHaveLength(2);
    expect(yellow.state.memory).toBe(2);

    const red = await playTakeru({
      battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }],
      chooseYellow: false,
    });
    expect(red.state.memory).toBe(1);
  });
});

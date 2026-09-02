import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-072.js";
import "../index.js";

const CARD_ID = "EX10-072";

describe("EX10-072 Spiral Mountain", () => {
  it("records the exact catalog and complete Main, Delay, and Security contracts", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Spiral Mountain",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Dark Masters"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const effects = compiled.effects;
    expect(effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } }],
    });
    expect(effects[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Draw", amount: 2 }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(effects[2]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["security"],
          optional: true,
          target: { filter: { faceUp: true, nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }] } },
        },
        { kind: "DelayedDeletePlayed" },
      ],
    });
    expect(effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], bindResultAs: "playedByThisEffect" },
        { kind: "AddToHandSelf" },
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          on: { filter: { boundRef: "playedByThisEffect" }, count: 1 },
        },
      ],
    });
  });

  it("plays without a color source when no Spiral Mountain exists, draws 2, and places itself", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "spiral" }], deck: ["BT1-001", "BT1-002"] } });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spiral").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
  });

  it("does not waive color while another Spiral Mountain is established", async () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "handSpiral" }], battleArea: [{ card: CARD_ID, as: "fieldSpiral" }] },
    });
    s.perm("fieldSpiral").placedByEffect = true;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("handSpiral").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("＜Delay＞ trashes itself to play a FACE-UP Dark Masters card from security, never a face-down one", async () => {
    // The ＜Delay＞ window belongs to seat 1, so seat 0's turn is "the opponent's turn" for it.
    // FAILS-WHEN-REVERTED: drop `faceUp: true` => `candidateLooseInstances` offers the face-down
    // security card too and `autoSelectCards` can play it; drop the ＜Delay＞ keyword => the
    // source is never trashed as the §16-17-1 activation cost.
    const s = setupEngine(
      {
        1: {
          battleArea: [{ card: CARD_ID, as: "spiral" }],
          security: [
            { card: "BT15-031", as: "faceUpDm", faceUp: true },
            { card: "EX10-020", as: "faceDownDm" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // §17-1-3-2-2 trashes any pure-Option permanent NOT placed by an effect, and a board spec
    // does not set that marker. Without this the sweep removes Spiral Mountain the moment a
    // window opens, so the ＜Delay＞ under test never gets to run.
    s.perm("spiral").placedByEffect = true;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("spiral"));
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-031"));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-031");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain(CARD_ID);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["EX10-020"]);
  });

  it("§16-17-3: the ＜Delay＞ effect cannot activate on the turn the card entered play", async () => {
    const s = setupEngine(
      {
        1: {
          battleArea: [{ card: CARD_ID, as: "spiral", enteredThisTurn: true }],
          security: [{ card: "BT15-031", as: "faceUpDm", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("spiral").placedByEffect = true;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("spiral"));
    await settle(() => false, 60);

    // No prompt is raised at all: `canActivate` refuses before the window offers the effect.
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT15-031"]);
  });

  it("Q5744: the Security-played Digimon is deleted at THIS turn's end, and only that one", async () => {
    // The [Security] effect resolves during the opponent's turn, so "at turn end" is the CURRENT
    // turn end — an `endOfTurn` watcher with no owner-turn gate, anchored to the played permanent
    // through `bindResultAs` / `boundRef`.
    // FAILS-WHEN-REVERTED: anchor the watcher on anything broader (the old `playedByThisEffect`
    // filter matched EVERY permanent) => the untouched bystander is deleted too.
    const s = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "spiral" }],
          battleArea: [{ card: "BT1-024", as: "bystander" }],
          hand: ["BT15-031"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("spiral"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-031"));

    // `fireArmedSubTriggers` skips the leading continuous recompute, so the already-armed
    // one-shot watcher installed by the [Security] resolution is the thing under test.
    await advance(s.engine).fireArmedSubTriggers("endOfTurn", {});
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-031"), 200);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-024"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("Security with no Dark Masters card still returns this card to the hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "spiral" }], hand: ["BT1-001"], trash: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("spiral"));
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === CARD_ID));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("Security plays only a Dark Masters Digimon and adds itself to hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "spiral" }], hand: ["BT15-031", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("spiral"));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-031");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT1-001");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });
});

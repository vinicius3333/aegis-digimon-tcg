import { getCardDefinition, type Permanent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-072.js";
import "../index.js";

const CARD_ID = "EX10-072";
/** EX10-057 Piedmon: [Dark Masters], purple, Lv.6. Its [On Play] needs an unsuspended
 *  opposing Digimon, so on an empty opposing board it is a no-op. */
const DARK_MASTERS = "EX10-057";
/** EX10-035 Machinedramon: a second [Dark Masters] Digimon, used as the face-down control. */
const OTHER_DARK_MASTERS = "EX10-035";
/** Inert main-deck Digimon (no printed text at all). */
const INERT = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];

function battleAreaIds(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map(({ topCard }) => topCard!.cardId);
}

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players.some((player) =>
    player.battleArea.some((permanent: Permanent) => permanent.topCard?.instanceId === instanceId),
  );
}

describe("EX10-072 Spiral Mountain — catalog and IR", () => {
  it("records the exact catalog and the complete Main, Delay, and Security contracts", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Spiral Mountain",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Dark Masters"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const effects = compiled.effects;
    expect(effects).toHaveLength(4);
    expect(effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } }],
    });
    // The waiver reads an EXACT name, not a substring: "[Spiral Mountain]".
    expect(effects[0]!.actions[0]).toMatchObject({
      condition: { filter: { zone: "battleArea", nameOrTrait: [{ tokens: ["Spiral Mountain"], match: "name" }] } },
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
          payCost: false,
          target: { filter: { faceUp: true, nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }] } },
        },
        // "At the end of YOUR turn" — the ＜Delay＞ resolves on the opponent's turn, so the
        // delete waits for the controller's own next turn end (default `endOfOwnerTurn`).
        { kind: "DelayedDeletePlayed" },
      ],
    });
    expect(effects[2]!.actions[1]).not.toMatchObject({ timing: "endOfCurrentTurn" });
    expect(effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          bindResultAs: "playedByThisEffect",
          target: { filter: { nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }] } },
        },
        { kind: "AddToHandSelf" },
        // "At TURN end": a [Security] effect resolves on the opponent's turn, so the delete
        // lands at the end of THAT turn, anchored to the permanent the play produced.
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          on: { filter: { boundRef: "playedByThisEffect" }, count: 1 },
        },
      ],
    });
    // The [Security] play must NOT be restricted to face-up cards; only the ＜Delay＞ is.
    expect(effects[3]!.actions[0]).not.toMatchObject({ target: { filter: { faceUp: true } } });
  });
});

describe("EX10-072 — colour-requirement waiver and the [Main] effect", () => {
  it("plays with no white source, draws 2, and places itself in the battle area", async () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "spiral" }], deck: ["BT1-009", "BT1-013", "BT1-014"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spiral").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => battleAreaIds(s, 0).includes(CARD_ID));

    // ＜Draw 2＞ then place: two cards drawn off the top, the Option itself on the board.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(battleAreaIds(s, 0)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    // REVERT-CONFIRM-RED: drop the `WaiveColorRequirement` effect => the play is refused as
    // `color-requirement-unmet` (there is no white source on this board).
  });

  it("does not waive the colour requirement while a [Spiral Mountain] is in the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "handSpiral" },
          { card: CARD_ID, as: "second" },
        ],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
      },
    });
    s.state.memory = 6;
    await s.ready();

    // Establish the first copy through the public [Main] play (it places itself).
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("handSpiral").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => battleAreaIds(s, 0).includes(CARD_ID));
    await s.ready();

    // The condition now fails, so the second copy has no colour source and is refused.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(battleAreaIds(s, 0)).toEqual([CARD_ID]);
    // REVERT-CONFIRM-RED: drop the `youHaveNone` condition => the waiver is unconditional and
    // the second copy is played.
  });
});

describe("EX10-072 — [End of Opponent's Turn] ＜Delay＞", () => {
  it("plays a FACE-UP [Dark Masters] Digimon from security on the opponent's turn end, then deletes it at its own turn end (Q5744)", async () => {
    const s = setupEngine(
      {
        0: { deck: [...INERT], security: ["BT1-009", "BT1-013"] },
        1: {
          hand: [{ card: CARD_ID, as: "spiral" }],
          deck: [...INERT],
          security: [
            { card: DARK_MASTERS, as: "faceUpDm", faceUp: true },
            { card: OTHER_DARK_MASTERS, as: "faceDownDm" },
            "BT1-009",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const spiralId = s.inst("spiral").instanceId;
    const faceUpId = s.inst("faceUpDm").instanceId;
    const faceDownId = s.inst("faceDownDm").instanceId;

    const loop = s.engine.startTurnLoop();

    // Turn 1 — seat 0 (the first turn player does not draw).
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Turn 2 — seat 1 plays Spiral Mountain through the public [Main] play.
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: spiralId })).toEqual({ ok: true });
    await settle(() => battleAreaIds(s, 1).includes(CARD_ID));
    expect(battleAreaIds(s, 1)).toEqual([CARD_ID]);
    // §16-17-3: it entered this turn, so its ＜Delay＞ cannot activate yet — and this turn is
    // seat 1's own turn anyway, which the EndOfOpponentsTurn gate refuses.
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3 — seat 0. Its END is "the end of the opponent's turn" for seat 1's Spiral Mountain.
    await advance(s.engine).waitForMainPhase(0);
    expect(battleAreaIds(s, 1)).toEqual([CARD_ID]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // The ＜Delay＞ paid its trash cost with the Option itself and played the FACE-UP card only.
    expect(onField(s, faceUpId)).toBe(true);
    expect(battleAreaIds(s, 1)).toEqual([DARK_MASTERS]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    // The face-down [Dark Masters] card was never an eligible candidate.
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toContain(faceDownId);
    // REVERT-CONFIRM-RED: drop `faceUp: true` from the ＜Delay＞ target filter => the face-down
    // security card becomes a candidate and `autoSelectCards` can play it instead.

    // Turn 4 — seat 1. "At the end of YOUR turn, delete the Digimon this effect played."
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(onField(s, faceUpId)).toBe(false);
    expect(battleAreaIds(s, 1)).toEqual([]);
    // It really left the battle area by DELETION: EX10-057's own [On Deletion] then placed it
    // face up at the bottom of security (no purple face-up security card was there).
    const security = s.state.players[1]!.security;
    expect(security.map(({ instanceId }) => instanceId).at(-1)).toBe(faceUpId);
    expect(security.at(-1)!.faceUp).toBe(true);
    // REVERT-CONFIRM-RED: drop the `DelayedDeletePlayed` action => the played Digimon survives.

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("survives the opponent's turn end when the controller declines the optional play", async () => {
    const s = setupEngine(
      {
        0: { deck: [...INERT], security: ["BT1-009", "BT1-013"] },
        1: {
          hand: [{ card: CARD_ID, as: "spiral" }],
          deck: [...INERT],
          security: [{ card: DARK_MASTERS, as: "faceUpDm", faceUp: true }, "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const spiralId = s.inst("spiral").instanceId;
    const faceUpId = s.inst("faceUpDm").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 3;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: spiralId })).toEqual({ ok: true });
    await settle(() => battleAreaIds(s, 1).includes(CARD_ID));
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Declined: nothing is played and the security card stays put.
    expect(onField(s, faceUpId)).toBe(false);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toContain(faceUpId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-072 — [Security]", () => {
  it("plays a [Dark Masters] Digimon from hand for free on a real security check, returns itself to hand, and deletes the played Digimon at THAT turn's end (Q5744)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: DARK_MASTERS, as: "piedmon" }, "BT1-009"],
          deck: [...INERT],
          // A bystander that this effect did not play: the control proving only the played
          // Digimon dies at turn end.
          battleArea: [{ card: "BT1-013", as: "bystander" }],
          security: [{ card: CARD_ID, as: "spiral" }, "BT1-009"],
        },
        1: {
          deck: [...INERT],
          battleArea: [{ card: "BT1-014", as: "attacker", dp: 20_000 }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const spiralId = s.inst("spiral").instanceId;
    const piedmonId = s.inst("piedmon").instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // Seat 1's turn: a real attack on the player triggers a real security check on EX10-072.
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId), 3000);

    // Played from hand without paying the cost (memory untouched by a play cost) …
    expect(onField(s, piedmonId)).toBe(true);
    expect(battleAreaIds(s, 0)).toContain(DARK_MASTERS);
    // … and "Then, add this card to the hand".
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(spiralId);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(spiralId);
    // REVERT-CONFIRM-RED: drop `AddToHandSelf` => EX10-072 goes to the trash like a plain
    // Option security effect.

    // "At turn end": the [Security] effect resolved on seat 1's turn, so the delete lands at
    // the end of THAT turn — not at seat 0's next turn end.
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(onField(s, piedmonId)).toBe(false);
    // Only the Digimon this effect played is deleted.
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: anchor the watcher on a broader filter (the old `playedByThisEffect`
    // context filter matched EVERY permanent) => the bystander is deleted too.

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays only a [Dark Masters] Digimon — a non-matching hand card is never a candidate", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: DARK_MASTERS, as: "piedmon" },
            { card: "BT1-013", as: "plain" },
          ],
          deck: [...INERT],
          security: [{ card: CARD_ID, as: "spiral" }, "BT1-009"],
        },
        1: {
          deck: [...INERT],
          battleArea: [{ card: "BT1-014", as: "attacker", dp: 20_000 }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const piedmonId = s.inst("piedmon").instanceId;
    const plainId = s.inst("plain").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId), 3000);

    // Exactly one card is played, and it is the [Dark Masters] one.
    expect(battleAreaIds(s, 0)).toEqual([DARK_MASTERS]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(plainId);
    // REVERT-CONFIRM-RED: drop the `nameOrTrait` filter => BT1-013 becomes a candidate.

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays the [Dark Masters] Digimon from the TRASH as well as the hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          trash: [{ card: DARK_MASTERS, as: "piedmon" }],
          deck: [...INERT],
          security: [{ card: CARD_ID, as: "spiral" }, "BT1-009"],
        },
        1: {
          deck: [...INERT],
          battleArea: [{ card: "BT1-014", as: "attacker", dp: 20_000 }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const piedmonId = s.inst("piedmon").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId), 3000);

    expect(battleAreaIds(s, 0)).toEqual([DARK_MASTERS]);
    // REVERT-CONFIRM-RED: drop "trash" from `from` => nothing is playable and the board stays
    // empty.

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still returns itself to the hand when there is no [Dark Masters] card to play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          deck: [...INERT],
          security: [{ card: CARD_ID, as: "spiral" }, "BT1-009"],
        },
        1: {
          deck: [...INERT],
          battleArea: [{ card: "BT1-014", as: "attacker", dp: 20_000 }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const spiralId = s.inst("spiral").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === spiralId), 3000);

    expect(battleAreaIds(s, 0)).toEqual([]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(spiralId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-072 — simultaneous turn-end processing (Q5745)", () => {
  it("resolves the Security delete alongside another end-of-turn processing in the same turn end", async () => {
    // Q5745: the turn-end delete of the Digimon this effect played and any other effect that
    // triggers at that same turn end are SIMULTANEOUS processing; the turn player picks the
    // order. BT15-079 Piedmon's `[End of Opponent's Turn] Delete this Digimon` gives seat 0 a
    // second processing at the very same boundary.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: DARK_MASTERS, as: "piedmon" }],
          deck: [...INERT],
          battleArea: [{ card: "BT15-079", as: "selfDeleter" }],
          security: [{ card: CARD_ID, as: "spiral" }, "BT1-009"],
        },
        1: {
          deck: [...INERT],
          battleArea: [{ card: "BT1-014", as: "attacker", dp: 20_000 }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const piedmonId = s.inst("piedmon").instanceId;
    const selfDeleterId = s.perm("selfDeleter").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, piedmonId), 3000);
    expect(onField(s, piedmonId)).toBe(true);
    expect(onField(s, selfDeleterId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // Both processings complete at that one turn end, whichever order is taken.
    expect(onField(s, piedmonId)).toBe(false);
    expect(onField(s, selfDeleterId)).toBe(false);
    expect(battleAreaIds(s, 0)).toEqual([]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-072 — peer interaction (Q6241)", () => {
  it("is a legal [Dark Masters] trait card for BT15-102 Apocalymon's play-cost placement, from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "spiral" },
            { card: "BT15-102", as: "apocalymon" },
          ],
          deck: [...INERT],
        },
        1: { deck: [...INERT] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const spiralId = s.inst("spiral").instanceId;
    const apocalymonId = s.inst("apocalymon").instanceId;

    s.state.memory = 3;
    await s.ready();
    // Establish Spiral Mountain in the battle area through its own public [Main] play.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: spiralId })).toEqual({ ok: true });
    await settle(() => battleAreaIds(s, 0).includes(CARD_ID));
    await s.ready();

    // Apocalymon costs 12; one placed [Dark Masters] card reduces it by 4.
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: apocalymonId })).toEqual({ ok: true });
    await settle(() => battleAreaIds(s, 0).includes("BT15-102"), 3000);

    const apocalymon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard!.cardId === "BT15-102")!;
    // Q6241: EX10-072 in the battle area is a legal card to place under Apocalymon.
    expect(apocalymon.stack.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(battleAreaIds(s, 0)).toEqual(["BT15-102"]);
  });
});

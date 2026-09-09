import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT17-100.js";
import "./index.js";

// BT17-100 Doomsday Clock (Option, Black, cost 3):
//   [Security] Add this card to the hand.
//   [Main] Play 1 [Diaboromon] Token without paying the cost (Digimon/Cost 14/Lv.6/White/
//     Mega/Unknown/Unidentified/3000 DP). Then, place this card as the bottom digivolution
//     card of 1 of your [Diaboromon] without [Doomsday Clock] in its digivolution cards.
//   [Start of Your Turn] If 4 [Doomsday Clock]s are placed in your battle area, you win the game.
//   [Inherited][All Turns] When this Digimon would leave the battle area by an opponent's
//     effect, by deleting 1 of your other [Diaboromon], prevent it from leaving.
//   [Inherited][End of Opponent's Turn] Place 1 [Doomsday Clock] from this Digimon's
//     digivolution cards in the battle area.
//
// KB coverage: Q2896 (cards can't be placed under a token), Q2897 (the activating player
// wins), Q2898 ("would leave" covers trash / hand / deck / security / breeding / placed
// under another card), Q2899 (the inherited end-of-opponent's-turn placement may place
// this very card).

const CLOCK = "BT17-100";
const DIABOROMON = "BT17-059"; // Black Lv6 Digimon named exactly "Diaboromon"
const COLOR_SOURCE = "BT10-022"; // Blue/Black Lv5 vanilla — §4-21 color requirement source
const INERT_LV3 = "BT1-009"; // Monodramon: no text, 3000 DP
const SPARE = "BT1-010"; // spare playable card so Main is not auto-passed
const OPPONENT_DELETE = "BT17-017"; // [On Play] delete 1 opponent Digimon
const X_ANTIBODY = "BT24-065"; // "Diaboromon (X Antibody)" — a different card name, not [Diaboromon]
const TOKEN_ID = "TOKEN-Diaboromon";

describe("BT17-100 Doomsday Clock — [Security] Add this card to the hand", () => {
  it("moves the checked card to hand, leaving trash and battle area untouched", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: CLOCK, as: "clockCard" }, INERT_LV3],
        hand: [SPARE],
      },
      1: { battleArea: [{ card: INERT_LV3, dp: 12_000, as: "attacker" }] },
    });
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 1;
    const clockId = s.inst("clockCard").instanceId;
    const handBefore = p0.hand.length;

    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.hand.some((c) => c.instanceId === clockId), 800);

    expect(p0.hand.map((c) => c.instanceId)).toContain(clockId);
    expect(p0.hand).toHaveLength(handBefore + 1);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(p0.battleArea.some((p) => p.topCard?.instanceId === clockId)).toBe(false);
    // Exactly the checked card left security; the rest of the stack is intact.
    expect(p0.security.map((c) => c.cardId)).toEqual([INERT_LV3]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT17-100 Doomsday Clock — [Main] token + bottom placement", () => {
  it("plays a 3000 DP Diaboromon Token and places itself under a clock-free Diaboromon", async () => {
    const preferredHostIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COLOR_SOURCE, as: "colorSource" },
            { card: DIABOROMON, as: "cleanHost" },
            { card: DIABOROMON, as: "taintedHost", under: [CLOCK] },
          ],
          hand: [{ card: CLOCK, as: "clockCard" }, SPARE],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredHostIds },
    );
    preferredHostIds.push(s.perm("cleanHost").permanentId);
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const clockId = s.inst("clockCard").instanceId;
    const handBefore = p0.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: clockId })).toEqual({ ok: true });

    await settle(
      () =>
        p0.battleArea.some((p) => p.topCard?.cardId === TOKEN_ID) &&
        s.perm("cleanHost").stack.some((card) => card.instanceId === clockId),
      800,
    );

    // Exactly one Diaboromon Token, with the printed token stats.
    const tokens = p0.battleArea.filter((p) => p.topCard?.cardId === TOKEN_ID);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.currentDP).toBe(3000);
    expect(getCardDefinition(TOKEN_ID)).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      dp: 3000,
      playCost: 14,
      colors: ["White"],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
      isToken: true,
    });

    // The Option itself became the BOTTOM digivolution card of the clock-free Diaboromon.
    expect(s.perm("cleanHost").stack.at(0)?.instanceId).toBe(clockId);
    expect(s.perm("cleanHost").topCard?.cardId).toBe(DIABOROMON);
    // The Diaboromon that already had a Doomsday Clock was not a legal destination.
    expect(s.perm("taintedHost").stack).toHaveLength(1);
    expect(s.perm("taintedHost").stack.some((card) => card.instanceId === clockId)).toBe(false);

    // Endpoints: the Option left hand, was not trashed, and its cost was paid (token is free).
    expect(p0.hand.some((c) => c.instanceId === clockId)).toBe(false);
    expect(p0.hand).toHaveLength(handBefore - 1);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(s.state.memory).toBe(7); // 10 - 3 play cost; the token costs nothing
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("picks the real clock-free [Diaboromon] over the token and over a Diaboromon (X Antibody) peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COLOR_SOURCE, as: "colorSource" },
            { card: X_ANTIBODY, as: "nearMiss" },
            { card: DIABOROMON, as: "cleanHost" },
          ],
          hand: [{ card: CLOCK, as: "clockCard" }, SPARE],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const clockId = s.inst("clockCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: clockId })).toEqual({ ok: true });
    await settle(() => s.perm("cleanHost").stack.some((card) => card.instanceId === clockId), 800);

    // [Diaboromon] is an exact name: "Diaboromon (X Antibody)" is a different card and is not a
    // legal destination, and Q2896 keeps the freshly played token out too.
    expect(s.perm("cleanHost").stack.at(0)?.instanceId).toBe(clockId);
    expect(s.perm("nearMiss").stack).toHaveLength(0);
    const tokens = p0.battleArea.filter((p) => p.topCard?.cardId === TOKEN_ID);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.stack).toHaveLength(0);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q2896: never places itself under the Diaboromon Token it just played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: COLOR_SOURCE, as: "colorSource" }],
          hand: [{ card: CLOCK, as: "clockCard" }, SPARE],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const clockId = s.inst("clockCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: clockId })).toEqual({ ok: true });

    await settle(() => p0.trash.some((c) => c.instanceId === clockId), 800);

    const tokens = p0.battleArea.filter((p) => p.topCard?.cardId === TOKEN_ID);
    expect(tokens).toHaveLength(1);
    // Cards can't be placed under tokens (Q2896): the token's stack stays empty and the
    // used Option goes to the trash instead.
    expect(tokens[0]!.stack).toHaveLength(0);
    expect(p0.trash.map((c) => c.instanceId)).toContain(clockId);
    expect(p0.battleArea.some((p) => p.stack.some((card) => card.instanceId === clockId))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT17-100 Doomsday Clock — [Start of Your Turn] win the game", () => {
  it("Q2897: the controller of the four placed clocks wins at the start of their own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
        ],
        deck: [INERT_LV3, INERT_LV3, INERT_LV3],
        hand: [SPARE],
      },
      1: { deck: [INERT_LV3, INERT_LV3, INERT_LV3], hand: [SPARE] },
    });
    await s.ready();
    expect(s.state.gameOver).toBe(false);

    // Real turn loop: seat 1 takes a turn, then seat 0's start-of-turn window opens.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    void s.engine.runOneTurn().catch(() => undefined);
    await settle(() => s.state.gameOver, 1500);

    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(0);
  });

  it("does not win with only three clocks in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
        ],
        deck: [INERT_LV3, INERT_LV3, INERT_LV3],
        hand: [SPARE],
      },
      1: { deck: [INERT_LV3, INERT_LV3, INERT_LV3], hand: [SPARE] },
    });
    await s.ready();

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    // The same real start-of-turn window the four-clock case wins in; nothing may fire here.
    // Seat 0 has no legal main action with three Options on the field, so production
    // auto-passes the turn: awaiting the turn itself is the whole window.
    await s.engine.runOneTurn();

    expect(s.state.gameOver).toBe(false);
    expect(s.state.winnerSeat).toBe(-1); // no winner sentinel
  });
});

describe("BT17-100 Doomsday Clock — inherited [All Turns] leave prevention", () => {
  it("Q2898: deletes another Diaboromon to prevent an opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: INERT_LV3, as: "protectedHost", under: [{ card: CLOCK, as: "stackedClock" }] },
            { card: DIABOROMON, as: "costBody" },
          ],
        },
        1: {
          battleArea: [{ card: COLOR_SOURCE, as: "opponentColorSource" }],
          hand: [{ card: OPPONENT_DELETE, as: "deleteEffect" }, SPARE],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const p0 = s.state.players[0]!;
    const protectedId = s.perm("protectedHost").permanentId;
    const costId = s.perm("costBody").permanentId;
    const clockId = s.inst("stackedClock").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deleteEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p0.battleArea.some((permanent) => permanent.permanentId === costId), 800);

    // The host stayed, its digivolution cards intact; the other Diaboromon paid the cost.
    expect(p0.battleArea.some((p) => p.permanentId === protectedId)).toBe(true);
    expect(s.perm("protectedHost").stack.map((c) => c.instanceId)).toEqual([clockId]);
    expect(p0.battleArea.some((p) => p.permanentId === costId)).toBe(false);
    expect(p0.trash.some((c) => c.cardId === DIABOROMON)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot prevent the leave when no other Diaboromon can pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT_LV3, as: "protectedHost", under: [{ card: CLOCK, as: "stackedClock" }] }],
        },
        1: {
          battleArea: [{ card: COLOR_SOURCE, as: "opponentColorSource" }],
          hand: [{ card: OPPONENT_DELETE, as: "deleteEffect" }, SPARE],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const p0 = s.state.players[0]!;
    const protectedId = s.perm("protectedHost").permanentId;
    const clockId = s.inst("stackedClock").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deleteEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p0.battleArea.some((permanent) => permanent.permanentId === protectedId), 800);

    expect(p0.battleArea.some((p) => p.permanentId === protectedId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT17-100 Doomsday Clock — inherited [End of Opponent's Turn] placement", () => {
  it("Q2899: places this very card from the host's digivolution cards into the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: DIABOROMON, as: "host", under: [{ card: CLOCK, as: "stackedClock" }] }],
          deck: [INERT_LV3, INERT_LV3],
          hand: [SPARE],
        },
        1: { deck: [INERT_LV3, INERT_LV3], hand: [SPARE] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const p0 = s.state.players[0]!;
    const clockId = s.inst("stackedClock").instanceId;
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual([clockId]);

    await advance(s.engine).runTurn(1);
    await settle(() => p0.battleArea.some((p) => p.topCard?.instanceId === clockId), 800);

    const placed = p0.battleArea.find((p) => p.topCard?.instanceId === clockId);
    expect(placed).toBeDefined();
    // Placed by an effect, so the rule-check sweep does not trash the Option (§17-1-3-2-2).
    expect(placed?.placedByEffect).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
  });
});

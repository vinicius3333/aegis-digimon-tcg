import { EffectTiming } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";

// A3 for BT17-100 (Doomsday Clock, Black Option):
//   [Security] Add this card to the hand.
//   [Main] Play 1 [Diaboromon] Token without paying the cost. Then, place this card as
//     the bottom digivolution card of 1 of your [Diaboromon] without [Doomsday Clock]
//     in its digivolution cards.
//   [Start of Your Turn] If 4 [Doomsday Clock]s are placed in your battle area, you win.
//   [Inherited][All Turns] When this Digimon would leave the battle area by an opponent's
//     effect, by deleting 1 of your other [Diaboromon], prevent it from leaving.
//   [Inherited][End of Opponent's Turn] Place 1 [Doomsday Clock] from this Digimon's
//     digivolution cards in the battle area.
//
// FAILS-WHEN-REVERTED: the declarative effect record had all clauses as RawUnparsed no-ops.
// Test 1: [Security] adds this card to hand (not trashed, not played).
// Test 2: [Start of Your Turn] win condition fires when 4 Doomsday Clocks are in battle.

const DOOMSDAY_CLOCK = "BT17-100";

describe("BT17-100 Doomsday Clock — [Security] add to hand", () => {
  it("[Security] adds this card to hand instead of trashing it when checked", async () => {
    // Seat 1 attacks into seat 0's security.
    const s = setupEngine({
      0: { security: [{ card: DOOMSDAY_CLOCK, as: "clockCard" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 12000, as: "attacker" }] },
    });
    const p0 = s.state.players[0];
    s.state.turnSeat = 1;
    const clockId = s.inst("clockCard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    });
    expect(res.ok).toBe(true);

    // Wait until Doomsday Clock leaves the security stack.
    await settle(() => !p0?.security.some((c) => c.instanceId === clockId), 800);

    // [Security] effect: card added to hand (not trashed, not played as permanent).
    expect(p0?.hand.some((c) => c.instanceId === clockId)).toBe(true);
    expect(p0?.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(p0?.battleArea.some((p) => p.topCard?.instanceId === clockId)).toBe(false);
  });
});

describe("BT17-100 Doomsday Clock — [Main] plays Diaboromon Token", () => {
  it("targets a Diaboromon without an existing Doomsday Clock", async () => {
    const place = (await import("./BT17-100.js")).compiled.effects?.find((e) => e.trigger === "Main")?.actions?.[1];
    expect(place).toMatchObject({
      position: "bottom",
      underFilter: { nameOrTrait: [{ tokens: ["Diaboromon"] }], excludeCardsNamed: ["Doomsday Clock"] },
    });
  });

  it("[Main] plays a Diaboromon Token when used as an Option card", async () => {
    // BT17-100 is an Option card; it is used from hand.
    // The [Main] effect (OnDeclaration) plays a Diaboromon Token.
    const preferredHostIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-022", dp: 3000, as: "colorSource" }, // §4-21 color-requirement source (Black)
            { card: "BT17-059", as: "cleanHost" },
            { card: "BT17-059", as: "taintedHost", under: [DOOMSDAY_CLOCK] },
          ],
          hand: [{ card: DOOMSDAY_CLOCK, as: "clockCard" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredHostIds },
    );
    preferredHostIds.push(s.perm("cleanHost").permanentId);
    const p0 = s.state.players[0];
    s.state.memory = 10; // enough memory to pay the cost
    const clockId = s.inst("clockCard").instanceId;

    // Use the Option card.
    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: clockId,
    });
    expect(res.ok).toBe(true);

    // Wait for the Diaboromon Token and the Option's stack placement to resolve.
    await settle(
      () =>
        (p0?.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-")) ?? false) &&
        (s.perm("cleanHost").stack.some((card) => card.instanceId === clockId) ?? false),
      600,
    );

    // A Diaboromon Token should have been played.
    const hasToken = p0?.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-"));
    expect(hasToken).toBe(true);
    expect(s.perm("cleanHost").stack.some((card) => card.instanceId === clockId)).toBe(true);
    expect(s.perm("cleanHost").stack.at(0)?.instanceId).toBe(clockId);
    expect(s.perm("taintedHost").stack.some((card) => card.instanceId === clockId)).toBe(false);
  });
});

describe("BT17-100 Doomsday Clock — inherited leave prevention", () => {
  it("deletes another Diaboromon to prevent an opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-059", as: "protected", under: [DOOMSDAY_CLOCK] },
            { card: "BT17-059", as: "cost" },
          ],
        },
        1: { hand: [{ card: "BT17-017", as: "opponentEffect" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;
    const costId = s.perm("cost").permanentId;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === protectedId) === true &&
        s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === costId) === false,
      600,
    );

    expect(s.state.players[0]?.battleArea.some((p) => p.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]?.battleArea.some((p) => p.permanentId === costId)).toBe(false);
  });

  it("places a stacked Doomsday Clock in the battle area at end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-059", as: "host", under: [{ card: DOOMSDAY_CLOCK, as: "stackedClock" }] }],
          deck: ["AD1-001"],
        },
        1: { deck: ["AD1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const clockId = s.inst("stackedClock").instanceId;

    await s.ready();
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]?.battleArea.some((p) => p.topCard?.instanceId === clockId) ?? false, 400);

    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.instanceId === clockId)).toBe(true);
  });
});

describe("BT17-100 Doomsday Clock — [Start of Your Turn] win", () => {
  it("wins for the clock controller during the real start-of-turn window when four clocks are present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [DOOMSDAY_CLOCK, DOOMSDAY_CLOCK, DOOMSDAY_CLOCK, DOOMSDAY_CLOCK],
        deck: ["AD1-001"],
      },
      1: { deck: ["AD1-001"] },
    });

    for (const permanent of s.state.players[0]!.battleArea) permanent.placedByEffect = true;
    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).fireGlobal(EffectTiming.OnStartTurn);

    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(0);
  });
});

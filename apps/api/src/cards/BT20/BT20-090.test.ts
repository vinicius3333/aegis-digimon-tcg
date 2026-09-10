import { describe, it, expect } from "vitest";
import { getCardDefinition, type Seat } from "@aegis/shared";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT20-090.js";
import "../BT11/BT11-079.js";
import "./index.js";

// A3 for BT20-090 (Yuuki — Purple Tamer).
//
// [Start of Your Turn] If you have 2 or less memory, set it to 3.
// [End of Your Turn] If you have 4 or fewer cards in your hand, by suspending this Tamer,
//   1 of your Digimon with the [Dark Dragon]/[Evil Dragon] trait attacks a player.
// [Security] Play this card without paying the cost.
//
// FAILS-WHEN-REVERTED: the [Start of Your Turn] sets memory to 3 when <= 2.

// BT11-079 = DarkLizardmon (Evil Dragon, Lv.3, dp 1000)
const YUUKI = "BT20-090";
const EVIL_DRAGON_DIGIMON = "BT11-079"; // DarkLizardmon, Evil Dragon

// Give each seat a deck (so the draw phase doesn't empty-deck) and, optionally, a hand
// card (so the main phase has an action). Board Spec baseline shared by every case below.
const DECK_FILLER = Array.from({ length: 5 }, () => "BT1-010");

interface Harness {
  s: EngineSetup;
}

function harness(board: BoardSpec): Harness {
  const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
  s.state.turnSeat = 0;
  s.state.isFirstPlayersFirstTurn = true;

  return { s };
}

/**
 * Drive one turn via runOneTurn(): wait for Main phase open, then send endPhase.
 */
async function driveTurn(h: Harness, seat: Seat): Promise<void> {
  const turn = h.s.engine.runOneTurn();
  await advance(h.s.engine).waitForMainPhase(seat);
  advance(h.s.engine).endMainPhaseIfOpen(seat);
  await turn;
}

describe("BT20-090 Yuuki — Tamer effects", () => {
  it("encodes all printed clauses without residuals", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["StartOfYourTurn", "EndOfYourTurn", "Security"]);
    expect(getCardDefinition(YUUKI)).toMatchObject({
      nameEn: "Yuuki",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
    });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      cost: { kind: "suspend" },
      condition: { kind: "handAtMost", value: 4 },
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          unsuspended: true,
          nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }],
        },
        count: 1,
      },
    });
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("[Start of Your Turn] sets memory to 3 when it is <= 2", async () => {
    const h = harness({
      // Place Yuuki on the battle area for seat 0.
      0: { battleArea: [{ card: YUUKI, dp: 3000, as: "tamer" }], deck: DECK_FILLER, hand: ["BT1-010"] },
      1: { deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    // Set memory to 1 (within the <= 2 threshold).
    h.s.state.memory = 1;
    h.s.state.turnSeat = 0;

    const turn = h.s.engine.runOneTurn();
    await advance(h.s.engine).waitForMainPhase(0);
    expect(h.s.state.memory).toBe(3);
    advance(h.s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("[Start of Your Turn] does NOT set memory to 3 when memory > 2", async () => {
    const h = harness({
      0: { battleArea: [{ card: YUUKI, dp: 3000, as: "tamer" }], deck: DECK_FILLER, hand: ["BT1-010"] },
      1: { deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    h.s.state.memory = 5;
    h.s.state.turnSeat = 0;

    const turn = h.s.engine.runOneTurn();
    await advance(h.s.engine).waitForMainPhase(0);
    expect(h.s.state.memory).toBe(5);
    advance(h.s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("[End of Your Turn] suspends Yuuki when conditions are met", async () => {
    const h = harness({
      0: {
        // Yuuki Tamer + an Evil Dragon Digimon (0 hand cards — satisfies <= 4 condition).
        battleArea: [
          { card: YUUKI, dp: 3000, as: "tamer" },
          { card: EVIL_DRAGON_DIGIMON, dp: 1000, as: "evilDragon" },
        ],
        deck: DECK_FILLER,
      },
      1: {
        deck: DECK_FILLER,
        hand: ["BT1-010"],
        // A security card so the forced attack resolves without ending the game abruptly.
        security: Array.from({ length: 5 }, () => "BT1-090"),
      },
    });
    const tamer = h.s.perm("tamer");

    h.s.state.memory = 0;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // The [End of Your Turn] effect resolved: Yuuki is now suspended.
    expect(tamer.isSuspended).toBe(true);
    expect(h.s.perm("evilDragon").isSuspended).toBe(true);
    expect(h.s.state.players[1]!.security).toHaveLength(4);
  });

  it("serializes cleanly and resolves independently for two Yuuki copies", async () => {
    expect(JSON.parse(JSON.stringify(compiled))).toEqual(compiled);

    const h = harness({
      0: {
        battleArea: [
          { card: YUUKI, dp: 3000, as: "tamer1" },
          { card: YUUKI, dp: 3000, as: "tamer2" },
          { card: EVIL_DRAGON_DIGIMON, dp: 1000, as: "evilDragon1" },
          { card: EVIL_DRAGON_DIGIMON, dp: 1000, as: "evilDragon2" },
        ],
        deck: DECK_FILLER,
      },
      1: { deck: DECK_FILLER, security: Array.from({ length: 5 }, () => "BT1-090") },
    });
    h.s.state.memory = 0;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    expect(h.s.perm("tamer1").isSuspended).toBe(true);
    expect(h.s.perm("tamer2").isSuspended).toBe(true);
    expect(h.s.perm("evilDragon1").isSuspended).toBe(true);
    expect(h.s.perm("evilDragon2").isSuspended).toBe(true);
    expect(h.s.state.players[1]!.security).toHaveLength(3);
  });
});

it("plays the exact BT20-090 security instance for free after a public check", async () => {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "BT1-010", as: "attacker" }] }, 1: { security: [{ card: "BT20-090", as: "tamer" }] } },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  const tamerId = s.inst("tamer").instanceId;
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "securityChecked"));
  expect(s.events.some((e) => e.kind === "securityChecked")).toBe(true);
  expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toContain(tamerId);
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(s.state.memory).toBe(3);
});

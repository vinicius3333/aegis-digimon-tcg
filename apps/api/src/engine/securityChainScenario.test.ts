import { describe, expect, it } from "vitest";
import { GameState, PlayerState, type Seat, type ServerEvent } from "@aegis/shared";
import { layDevScenario } from "./devScenario.js";
import { RED_DECK, BLUE_DECK } from "./testDecks.js";
import { setupEngine, settle } from "./testkit/harness.js";
// Self-register every compiled-IR card module so AD1-013's real IR is looked up.
import "../cards/index.js";

/**
 * Guards the `security-chain` dev board (`/dev/battle?scenario=security-chain`).
 *
 * A security check the server is still resolving holds the revealed card centre-stage on the
 * defending client until `securityChecked` arrives. Every question the check asks in that gap
 * is a bot think time — ~2.5 s each — spent with nothing moving on screen, and production hit
 * a check that asked two in a row and held for 5.3 s. `security-battle` only ever asks one,
 * so the board that reaches the longer hold is the one worth pinning: if the stack below
 * stops offering a second question, the repro silently degrades into the shorter one.
 */

const ATTACKER = "AD1-013"; // ZeigGreymon, Lv.6, 11000 DP
const SECURITY = "EX12-076"; // Susanoomon, Lv.7, 16000 DP — wins the battle, so the attacker dies
const UNDER = ["BT10-003", "BT19-008", "BT21-021"]; // bottom to top; the Lv.3 and Lv.5 are the candidates

describe("security-chain dev scenario", () => {
  it("lays an attacker whose death has two questions to ask", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("security-chain", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    const bot = state.players[1] as PlayerState;
    const attacker = bot.battleArea.at(0);

    expect(state.turnSeat).toBe(1);
    expect(human.security.at(0)?.cardId).toBe(SECURITY);
    expect(attacker?.topCard?.cardId).toBe(ATTACKER);
    // Both are level 5 or lower [Xros Heart] Digimon, so the replacement has a real choice to
    // put to the bot rather than a single forced pick it can answer without asking.
    expect(attacker?.stack.map((card) => card.cardId)).toEqual(UNDER);
  });

  it("asks the attacking seat twice inside one open check", async () => {
    const s = setupEngine(
      {
        0: { security: [SECURITY], battleArea: [] },
        1: { battleArea: [{ card: ATTACKER, as: "attacker", under: UNDER }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1 as Seat;
    await s.ready();

    await s.engine.applyIntent(1 as Seat, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((event: ServerEvent) => event.kind === "securityChecked"));

    const kinds = s.events.map((event: ServerEvent) => event.kind);
    const revealed = kinds.indexOf("securityRevealed");
    const checked = kinds.indexOf("securityChecked");
    expect(revealed).toBeGreaterThanOrEqual(0);
    expect(checked).toBeGreaterThan(revealed);

    // Each of these is a bot pause on the live server, and the defending client holds the
    // revealed card for their sum.
    const asked = s.decisions.filter((decision) => decision.seat === 1);
    expect(asked.length).toBeGreaterThanOrEqual(2);

    // The pause is a reflex or a think time depending on this field alone. A replacement
    // resolves from the removal seam with no timing of its own, so without the install-time
    // timing these arrive blank and the bot paces a frozen board at 2-2.8s per question.
    for (const decision of asked) expect(decision.req.options?.timing).toBe("AllTurns");
  });
});

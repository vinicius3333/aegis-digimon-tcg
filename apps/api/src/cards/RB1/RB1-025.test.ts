import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-025 Diarbbitmon", () => {
  it("suspends one opponent Digimon and gains memory only after none remain unsuspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-025", as: "diarbbit" }] },
        1: {
          battleArea: [
            { card: "EX2-045", as: "target" },
            { card: "BT1-009", as: "alreadySuspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("diarbbit"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("may force an Angoramon Digimon to attack an opponent Digimon at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-025", as: "diarbbit" },
            { card: "RB1-020", as: "angoramon" },
          ],
        },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("diarbbit"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX2-045"));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX2-045")).toBe(true);
  });

  it("does not open the attack effect when every Angoramon-text Digimon is suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-025", as: "diarbbit", suspended: true }] },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("diarbbit"));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX2-045")).toBe(false);
  });
});

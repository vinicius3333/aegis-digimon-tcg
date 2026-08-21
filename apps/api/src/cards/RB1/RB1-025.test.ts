import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-025 Diarbbitmon", () => {
  it("may force an Angoramon Digimon to attack an opponent Digimon at end of turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-025", as: "diarbbit" }, { card: "RB1-024", as: "angoramon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("diarbbit"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("angoramon").permanentId)).toBe(
      true,
    );
  });

  it("does not open the attack effect when no Angoramon-named Digimon is available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-025", as: "diarbbit" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("diarbbit"));

    expect(s.perm("target").isSuspended).toBe(false);
  });
});

import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-010 Siriusmon", () => {
  it("places a Gammamon-text card as cost before deleting a qualifying opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-010", as: "sirius" }], hand: ["RB1-005"] },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sirius"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("sirius").stack.some((card) => card.cardId === "RB1-005")).toBe(true);
  });

  it("does not pay the placement cost or delete when the player declines", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-010", as: "sirius" }] },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sirius"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});

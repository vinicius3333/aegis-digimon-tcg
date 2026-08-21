import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-034 Ruli Tsukiyono", () => {
  it("unsuspends one suspended Digimon with Angoramon in its name at end of turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-034", as: "ruli" }, { card: "RB1-022", as: "angoramon", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("ruli"));

    expect(s.perm("angoramon").isSuspended).toBe(false);
  });
});

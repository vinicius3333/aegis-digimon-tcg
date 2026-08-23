import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-065.js";

describe("EX1-065 Diaboromon", () => {
  it("gives every allied Diaboromon Blocker during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-065", as: "source" },
          { card: "EX1-065", as: "other" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(true);
  });

  it("may play a Diaboromon Token from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "EX1-065", as: "security", faceUp: true }] } },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("TOKEN-Diaboromon");
  });

  it("may decline to play the security token", async () => {
    const s = setupEngine(
      { 1: { security: [{ card: "EX1-065", as: "security", faceUp: true }] } },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});

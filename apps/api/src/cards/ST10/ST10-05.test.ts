import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-05.js";

describe("ST10-05 Angewomon", () => {
  it("gives an opposing Digimon Security Attack -2 on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST10-05", as: "angewomon" }] }, 1: { battleArea: [{ card: "ST10-07", as: "target" }] } },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angewomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
  });

  it("gives its host Security Attack +1 while you have a purple Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-06", as: "host", under: ["ST10-05"] },
            { card: "ST10-07", as: "purple" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("keeps Security Attack -2 through the opponent's turn and clears it when that turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST10-05", as: "angewomon" }] },
        1: { battleArea: [{ card: "ST10-07", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angewomon"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);

    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
});

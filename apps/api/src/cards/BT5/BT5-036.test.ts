import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-036.js";

describe("BT5-036 Renamon", () => {
  it("gives an opponent Digimon Security Attack -1 until their next turn ends", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT5-036", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT5-041", as: "target" },
            { card: "BT5-041", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "SecurityAttack")).toBe(false);
  });

  it("targets only one opposing Digimon and expires after that opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-036", as: "source" }],
          battleArea: [{ card: "BT5-041", as: "own" }],
        },
        1: {
          hand: ["BT1-009"],
          battleArea: [
            { card: "BT5-041", as: "target" },
            { card: "BT5-041", as: "other" },
          ],
          security: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("own"), "SecurityAttack")).toBe(0);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
});

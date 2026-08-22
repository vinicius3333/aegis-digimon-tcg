import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-080.js";

describe("BT11-080 Devimon", () => {
  it("gains Rush and Retaliation during its turn while a yellow permanent is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-080", as: "devimon" },
          { card: "BT1-087", as: "yellow-tamer" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("devimon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("devimon"), "Retaliation")).toBe(true);
  });

  it("has neither keyword without a yellow Digimon or Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-080", as: "devimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("devimon"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("devimon"), "Retaliation")).toBe(false);
  });

  it("does not count the opponent's yellow permanents or grant the keywords on the opponent's turn", async () => {
    const opponentYellow = setupEngine({
      0: { battleArea: [{ card: "BT11-080", as: "devimon" }] },
      1: { battleArea: [{ card: "BT1-087", as: "opponent-yellow-tamer" }] },
    });
    await opponentYellow.engine.recomputeContinuousEffects();
    expect(observe(opponentYellow.engine).hasKeyword(opponentYellow.perm("devimon"), "Rush")).toBe(false);
    expect(observe(opponentYellow.engine).hasKeyword(opponentYellow.perm("devimon"), "Retaliation")).toBe(false);

    const opponentTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-080", as: "devimon" },
          { card: "BT1-087", as: "yellow-tamer" },
        ],
      },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.engine.recomputeContinuousEffects();
    expect(observe(opponentTurn.engine).hasKeyword(opponentTurn.perm("devimon"), "Rush")).toBe(false);
    expect(observe(opponentTurn.engine).hasKeyword(opponentTurn.perm("devimon"), "Retaliation")).toBe(false);
  });
});

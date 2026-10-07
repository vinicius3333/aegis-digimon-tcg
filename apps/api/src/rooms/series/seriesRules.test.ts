import { describe, expect, it } from "vitest";
import { seriesVerdict, turnOrderChooser } from "./seriesRules.js";

describe("seriesVerdict", () => {
  it("continues until a seat has two wins", () => {
    expect(seriesVerdict(3, [0])).toEqual({ kind: "continue" });
    expect(seriesVerdict(3, [0, 1])).toEqual({ kind: "continue" });
    expect(seriesVerdict(3, [0, 0])).toEqual({ kind: "won", winnerSeat: 0 });
    expect(seriesVerdict(3, [1, 0, 1])).toEqual({ kind: "won", winnerSeat: 1 });
  });

  it("counts a draw for nobody and plays on", () => {
    expect(seriesVerdict(3, [-1, 0, -1])).toEqual({ kind: "continue" });
    expect(seriesVerdict(3, [-1, 0, -1, 0])).toEqual({ kind: "won", winnerSeat: 0 });
  });

  it("stops at five games: the leader wins, an even score is a drawn series", () => {
    expect(seriesVerdict(3, [-1, -1, 1, -1, -1])).toEqual({ kind: "won", winnerSeat: 1 });
    expect(seriesVerdict(3, [-1, 0, 1, -1, -1])).toEqual({ kind: "draw" });
  });

  it("ends a single game after its only result", () => {
    expect(seriesVerdict(1, [1])).toEqual({ kind: "won", winnerSeat: 1 });
  });
});

describe("turnOrderChooser", () => {
  it("hands the choice to the loser", () => {
    expect(turnOrderChooser(0, 0)).toBe(1);
    expect(turnOrderChooser(1, 0)).toBe(0);
  });

  it("hands it to the seat that went second after a draw", () => {
    expect(turnOrderChooser(-1, 0)).toBe(1);
    expect(turnOrderChooser(-1, 1)).toBe(0);
  });
});

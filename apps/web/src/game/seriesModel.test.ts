import { describe, expect, it } from "vitest";
import { SeriesState } from "@aegis/shared";
import { seriesView } from "./seriesModel";

function series(fields: Partial<Omit<SeriesState, "results">> & { results?: number[] }) {
  const state = new SeriesState();
  const { results = [], ...rest } = fields;
  Object.assign(state, rest);
  state.results.push(...results);
  return state;
}

describe("seriesView", () => {
  it("shows nothing for a single game", () => {
    expect(seriesView(series({ bestOf: 1 }), 0)).toBeUndefined();
  });

  it("reads every count and pip from the viewer's side", () => {
    const state = series({ bestOf: 3, gameNumber: 2, wins0: 0, wins1: 1, results: [1], phase: "choosing", chooserSeat: 0 });
    expect(seriesView(state, 0)).toMatchObject({
      viewerWins: 0,
      opponentWins: 1,
      pips: ["loss", "pending", "pending"],
      viewerChooses: true,
    });
    expect(seriesView(state, 1)).toMatchObject({
      viewerWins: 1,
      opponentWins: 0,
      pips: ["win", "pending", "pending"],
      viewerChooses: false,
    });
  });

  it("keeps one game to come after draws push the series past three games", () => {
    const state = series({ bestOf: 3, results: [-1, 0, -1], wins0: 1 });
    expect(seriesView(state, 0)?.pips).toEqual(["draw", "win", "draw", "pending"]);
  });

  it("names the series outcome once it is over", () => {
    const over = series({ bestOf: 3, results: [0, 1, 0], wins0: 2, wins1: 1, phase: "over", winnerSeat: 0 });
    expect(seriesView(over, 0)).toMatchObject({ outcome: "win", pips: ["win", "loss", "win"] });
    expect(seriesView(over, 1)?.outcome).toBe("loss");
    expect(seriesView(series({ bestOf: 3, phase: "over", winnerSeat: -1 }), 0)?.outcome).toBe("draw");
  });

  it("knows who starts the next game once it is chosen", () => {
    const starting = series({ bestOf: 3, phase: "starting", nextFirstSeat: 1, results: [0] });
    expect(seriesView(starting, 1)?.viewerGoesFirst).toBe(true);
    expect(seriesView(starting, 0)?.viewerGoesFirst).toBe(false);
  });
});

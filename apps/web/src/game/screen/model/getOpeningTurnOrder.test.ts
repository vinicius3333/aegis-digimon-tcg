import { describe, expect, it } from "vitest";
import { getOpeningTurnOrder } from "@/game/screen/model/getOpeningTurnOrder";

describe("opening turn order during the mulligan", () => {
  it("tells the seat that takes turn 1 it goes first", () => {
    expect(getOpeningTurnOrder({ state: { turnCount: 0, turnSeat: 1 }, viewerSeat: 1 })).toBe("first");
  });

  it("tells the other seat it goes second", () => {
    expect(getOpeningTurnOrder({ state: { turnCount: 0, turnSeat: 1 }, viewerSeat: 0 })).toBe("second");
  });

  it("names no order once the turn loop has started", () => {
    expect(getOpeningTurnOrder({ state: { turnCount: 1, turnSeat: 0 }, viewerSeat: 0 })).toBeUndefined();
  });
});

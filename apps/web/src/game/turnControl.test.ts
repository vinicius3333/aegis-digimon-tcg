import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { isBreedingWindow, turnControlLabelKey, turnControlState } from "./turnControl";

describe("turnControlState", () => {
  it("waits out the opponent's turn, whatever phase it is in", () => {
    expect(turnControlState({ phase: Phase.Main, turnSeat: 1, viewerSeat: 0 })).toBe("waiting");
    expect(turnControlState({ phase: Phase.Breeding, turnSeat: 1, viewerSeat: 0 })).toBe("waiting");
  });

  it("ends the breeding step during the viewer's breeding phase", () => {
    expect(turnControlState({ phase: Phase.Breeding, turnSeat: 0, viewerSeat: 0 })).toBe("endBreeding");
  });

  it("ends the turn in every other phase of the viewer's turn", () => {
    for (const phase of [Phase.Active, Phase.Draw, Phase.Main, Phase.End]) {
      expect(turnControlState({ phase, turnSeat: 0, viewerSeat: 0 })).toBe("endTurn");
    }
  });

  it("gives every state its own label", () => {
    const keys = (["endTurn", "endBreeding", "waiting"] as const).map(turnControlLabelKey);
    expect(new Set(keys).size).toBe(3);
  });
});

describe("isBreedingWindow", () => {
  it("is the viewer's own breeding phase and nothing else", () => {
    expect(isBreedingWindow({ phase: Phase.Breeding, turnSeat: 0, viewerSeat: 0 })).toBe(true);
    expect(isBreedingWindow({ phase: Phase.Breeding, turnSeat: 1, viewerSeat: 0 })).toBe(false);
    expect(isBreedingWindow({ phase: Phase.Main, turnSeat: 0, viewerSeat: 0 })).toBe(false);
  });
});

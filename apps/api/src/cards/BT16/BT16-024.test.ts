import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-024.js";

describe("BT16-024", () => {
  it("searches security and optionally digivolves into an Angel", () => {
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Search", searchZone: "security", purpose: "digivolveAmongRevealed", count: "all" });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Digivolve", reduceCost: 2, from: ["security"], amongPreviousSearch: true, optional: true });
    }
  });

  it("can place an Angel from hand into security and grants inherited Blocker", () => {
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], toTop: false, optional: true });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "forTheTurn" }] });
  });
});

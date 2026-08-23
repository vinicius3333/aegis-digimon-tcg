import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-024.js";
import "../index.js";

describe("BT16-024", () => {
  it("searches security and optionally digivolves into an Angel", () => {
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Search",
        searchZone: "security",
        purpose: "digivolveAmongRevealed",
        count: "all",
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Digivolve",
        reduceCost: 2,
        from: ["security"],
        amongPreviousSearch: true,
        optional: true,
      });
    }
  });

  it("can place an Angel from hand into security and grants inherited Blocker", () => {
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["hand"],
      toTop: false,
      optional: true,
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "forTheTurn" }],
    });
  });

  it("grants Blocker to your Angel-family Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "source", under: ["BT16-024"] },
          { card: "BT16-019", as: "angel" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("source").permanentId, "Blocker")).toBe(false);
    expect(continuous.hasKeyword(s.perm("angel").permanentId, "Blocker")).toBe(true);
    expect(continuous.hasKeyword(s.perm("other").permanentId, "Blocker")).toBe(false);
  });
});

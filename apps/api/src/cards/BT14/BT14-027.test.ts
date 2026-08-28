import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-027.js";

describe("BT14-027", () => {
  it("preserves MarineDevimon's catalog identity and exact all-player IR", () => {
    expect(getCardDefinition("BT14-027")).toMatchObject({
      nameEn: "MarineDevimon",
      colors: ["Blue"],
      level: 5,
      playCost: 6,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      attributes: ["Virus"],
      types: ["Aquabeast"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Return",
        to: "hand",
        target: { count: "all", filter: { controller: "any", kind: ["Digimon"], levels: [3] } },
      });
  });

  it("Q2395 returns every level 3 Digimon on both sides on play and preserves other levels", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-027", as: "marine" }],
          battleArea: [
            { card: "BT14-020", as: "ownLevel3" },
            { card: "BT14-022", as: "ownLevel4" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT14-020", as: "opponentLevel3a" },
            { card: "BT14-021", as: "opponentLevel3b" },
            { card: "BT14-025", as: "opponentLevel4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-020"));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-020");
    expect(s.state.players[1]!.hand.map((card) => card.cardId).sort()).toEqual(["BT14-020", "BT14-021"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "BT14-022",
      "BT14-027",
    ]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT14-025"]);
    assertNoLoudGap(s);
  });

  it("evolves legally from Shellmon and obligatorily returns its controller's level 3 too", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-025", as: "base" },
            { card: "BT14-020", as: "ownLevel3" },
          ],
          hand: [{ card: "BT14-027", as: "marine" }],
        },
        1: { battleArea: [{ card: "BT14-021", as: "opponentLevel3" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("marine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-020"));
    expect(s.perm("base").topCard.cardId).toBe("BT14-027");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-025"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-020");
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT14-021");
    expect(s.state.memory).toBe(4);
    assertNoLoudGap(s);
  });
});

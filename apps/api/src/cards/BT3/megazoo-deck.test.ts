import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-112.js";

describe("BT3 Mega Zoo / Omnimon Alter-S deck", () => {
  it("de-digivolves the whole opposing board before deleting every resulting 5000-DP-or-less Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-074", as: "megaZooBase" }],
          hand: [{ card: "BT3-112", as: "alterS" }],
        },
        1: {
          battleArea: [
            {
              card: "BT2-020",
              as: "becomesSmall",
              under: [{ card: "BT1-009", as: "revealedRookie" }],
            },
            {
              card: "BT2-083",
              as: "staysLarge",
              under: [{ card: "BT1-083", as: "revealedMega" }],
            },
            { card: "BT1-010", as: "nakedSmall" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const becomesSmallId = s.perm("becomesSmall").permanentId;
    const nakedSmallId = s.perm("nakedSmall").permanentId;
    const tamerId = s.perm("tamer").permanentId;
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("megaZooBase").permanentId,
        instanceId: s.inst("alterS").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(
          (permanent) => permanent.permanentId === becomesSmallId || permanent.permanentId === nakedSmallId,
        ) && s.perm("staysLarge").topCard.cardId === "BT1-083",
      5000,
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tamerId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT2-020")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT2-083")).toBe(true);
    expect(s.perm("staysLarge").topCard.cardId).toBe("BT1-083");
    assertNoLoudGap(s);
  });
});

import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../../../cards/index.js";
import type { EffectContext } from "../../EffectContext.js";
import { setupEngine } from "../../../testkit/harness.js";
import type { BoardSpec } from "../../../testkit/harness.js";
import { availableEffectPlayDigiXrosReduction } from "./effectPlayDigiXrosAvailability.js";

function reductionFor(cardId: string, board: BoardSpec): number {
  const s = setupEngine(board);
  const ctx = {
    game: {
      player: (seat: Seat) => s.state.players[seat]!,
      definitionOf: (card: { cardId: string }) => getCardDefinition(card.cardId)!,
    },
    fx: {},
  } as unknown as EffectContext;
  return availableEffectPlayDigiXrosReduction(ctx, { cardId, instanceId: "pending-play", ownerSeat: 0 });
}

describe("paid effect DigiXros availability — Discord 1556113288599834624", () => {
  it("counts different physical cards only once per named recipe slot", () => {
    expect(reductionFor("AD1-006", { 0: { hand: ["BT11-015", "BT11-015", "AD1-013"] } })).toBe(4);
  });

  it("requires different card numbers for Machinedramon's repeated Cyborg/Composite recipe", () => {
    expect(reductionFor("BT19-065", { 0: { hand: ["BT19-061", "BT19-061"] } })).toBe(1);
    expect(reductionFor("BT19-065", { 0: { hand: ["BT19-061", "BT2-063"] } })).toBe(2);
  });

  it("requires different names for Dorbickmon's repeated Dragon recipe", () => {
    expect(reductionFor("EX3-014", { 0: { hand: ["BT1-009", "BT1-009"] } })).toBe(2);
    expect(reductionFor("EX3-014", { 0: { hand: ["BT1-009", "BT1-020"] } })).toBe(4);
  });

  it("honors EX6-025's printed single-material cap despite different matching cards", () => {
    expect(reductionFor("EX6-025", { 0: { hand: ["EX6-023", "EX6-024", "EX6-026"] } })).toBe(2);
  });

  it.each(["BT10-087", "BT10-088"])(
    "Discord 1556119607822254110: combines materials beneath different Tamers with %s",
    (expanderCardId) => {
      expect(
        reductionFor("AD1-006", {
          0: {
            battleArea: [
              { card: expanderCardId, under: ["BT11-015"] },
              { card: "P-224", under: ["AD1-013"] },
            ],
          },
        }),
      ).toBe(4);
      expect(
        reductionFor("AD1-006", {
          0: { battleArea: [{ card: expanderCardId }, { card: "P-224", under: ["BT11-015", "AD1-013"] }] },
        }),
      ).toBe(4);
      expect(
        reductionFor("AD1-006", {
          0: {
            battleArea: [
              { card: expanderCardId, suspended: true, under: ["BT11-015"] },
              { card: "P-224", under: ["AD1-013"] },
            ],
          },
        }),
      ).toBe(0);
    },
  );

  it("limits each EX4-062 expansion to one stored card and one trash card", () => {
    expect(
      reductionFor("BT11-018", {
        0: {
          trash: ["BT11-015"],
          battleArea: [{ card: "EX4-062", under: ["BT11-015", "AD1-013"] }],
        },
      }),
    ).toBe(6);
  });
});

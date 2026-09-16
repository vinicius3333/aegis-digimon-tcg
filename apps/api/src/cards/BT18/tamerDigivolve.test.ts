import { describe, it, expect } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";

const TAMER = {
  Red: "BT1-085",
  Blue: "BT1-086",
  Green: "BT1-088",
  Yellow: "BT1-087",
  Black: "BT10-092",
  Purple: "BT10-093",
} as const;

type Color = keyof typeof TAMER;

const TAMER_PATH: Record<string, { cost: number; colors: Color[] }> = {
  "BT21-013": { cost: 2, colors: ["Red"] },
  "BT21-014": { cost: 3, colors: ["Red"] },
  "BT18-011": { cost: 3, colors: ["Red", "Purple"] },
  "BT18-012": { cost: 2, colors: ["Red"] },
  "BT18-014": { cost: 3, colors: ["Red"] },
  "BT18-022": { cost: 3, colors: ["Blue", "Red"] },
  "BT18-023": { cost: 2, colors: ["Blue"] },
  "BT18-024": { cost: 3, colors: ["Blue"] },
  "BT18-025": { cost: 4, colors: ["Blue", "Red"] },
  "BT18-037": { cost: 3, colors: ["Yellow", "Blue"] },
  "BT18-047": { cost: 2, colors: ["Green"] },
  "BT18-048": { cost: 3, colors: ["Green", "Red"] },
  "BT18-049": { cost: 4, colors: ["Green", "Red"] },
  "BT18-050": { cost: 3, colors: ["Green"] },
  "BT18-063": { cost: 3, colors: ["Black", "Yellow"] },
  "BT18-064": { cost: 2, colors: ["Black"] },
  "BT18-066": { cost: 3, colors: ["Black"] },
  "BT18-067": { cost: 4, colors: ["Black", "Yellow"] },
  "BT18-076": { cost: 3, colors: ["Purple", "Yellow"] },
  "BT18-077": { cost: 4, colors: ["Purple", "Yellow"] },
  "BT18-078": { cost: 3, colors: ["Purple"] },
  "BT18-079": { cost: 4, colors: ["Purple"] },
};

const ALL_COLORS: Color[] = ["Red", "Blue", "Green", "Yellow", "Black", "Purple"];

describe("Frontier Tamer-base digivolution paths", () => {
  for (const [cardId, { cost, colors }] of Object.entries(TAMER_PATH)) {
    it(`${cardId}: digivolves from each listed Tamer color for cost ${cost}`, () => {
      for (const color of colors) {
        const req = matchingAlternateDigivolutionRequirement(cardId, TAMER[color]);
        expect(req, `${cardId} from ${color} Tamer`).toBeDefined();
        expect(req?.cost, `${cardId} from ${color} Tamer cost`).toBe(cost);
        expect(req?.baseIsTamer).toBe(true);
      }
    });

    it(`${cardId}: rejects an off-color Tamer`, () => {
      const offColors = ALL_COLORS.filter((c) => !colors.includes(c));
      for (const color of offColors) {
        const req = matchingAlternateDigivolutionRequirement(cardId, TAMER[color]);
        if (req?.baseIsTamer) {
          expect.fail(`${cardId} should not digivolve from a ${color} Tamer`);
        }
      }
    });
  }

  it("BT21-014: still resolves the named Agunimon path (cost 1)", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-014", "BT12-012");
    expect(req).toBeDefined();
    expect(req?.cost).toBe(1);
    expect(req?.baseIsTamer).toBeUndefined();
  });
});

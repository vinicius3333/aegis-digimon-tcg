import { describe, it, expect } from "vitest";
import { dnaDigivolutionRequirementsFor } from "./data.js";

/**
 * Every card that prints a `[DNA Digivolve]` header must resolve to a structured requirement.
 *
 * `dnaDigivolveCostFor` (apps/api) falls back to the best printed single-base digivolve cost when
 * a destination has no DNA requirement, which silently turns any card the `into` filter admits
 * into a legal DNA result. The pre-EX9 card imports dropped the community DB's `dnaDigivolve`
 * header, so these recipes live in DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES rather than in
 * cards.json. This list is the full set as of the 2026-09-06 audit
 * (docs/audits/DNA-DIGIVOLVE-INTO-FILTER-AUDIT.md); extend it when a new DNA card is imported.
 */
const CARDS_PRINTING_A_DNA_HEADER = [
  "AD1-011", "AD1-025", "BT12-028", "BT12-055", "BT13-059", "BT16-012",
  "BT16-025", "BT16-036", "BT16-063", "BT16-077", "BT17-078", "BT17-101",
  "BT18-019", "BT18-041", "BT20-016", "BT20-021", "BT20-037", "BT20-045",
  "BT20-060", "BT20-074", "BT20-076", "BT20-081", "BT21-039", "BT22-015",
  "BT23-032", "BT23-047", "BT23-102", "BT24-037", "BT25-038", "BT25-103",
  "BT8-015", "BT8-042", "BT8-084", "BT9-082", "EX11-073", "EX12-017",
  "EX12-028", "EX12-032", "EX12-035", "EX12-037", "EX12-044", "EX12-055",
  "EX12-058", "EX12-060", "EX12-077", "EX3-010", "EX3-061", "EX3-063",
  "EX3-074", "EX4-060", "EX5-073", "EX6-011", "EX6-029", "EX6-062",
  "EX7-037", "EX8-025", "EX8-029", "EX8-033", "EX8-045", "EX8-064",
  "EX9-021", "EX9-045", "P-171", "P-172", "P-174", "P-187",
  "P-220", "P-221", "ST10-06", "ST13-06", "ST9-05", "ST9-11",
];

describe("dnaDigivolutionRequirementsFor / DNA destination coverage", () => {
  it.each(CARDS_PRINTING_A_DNA_HEADER)("%s resolves to a DNA requirement", (cardId) => {
    expect(dnaDigivolutionRequirementsFor(cardId).length).toBeGreaterThan(0);
  });

  it("gives every requirement exactly two material specs", () => {
    for (const cardId of CARDS_PRINTING_A_DNA_HEADER) {
      for (const requirement of dnaDigivolutionRequirementsFor(cardId)) {
        expect({ cardId, materials: requirement.materials.length }).toEqual({ cardId, materials: 2 });
      }
    }
  });

  it("constrains every material spec by at least one attribute", () => {
    for (const cardId of CARDS_PRINTING_A_DNA_HEADER) {
      for (const requirement of dnaDigivolutionRequirementsFor(cardId)) {
        for (const material of requirement.materials) {
          expect({ cardId, constrained: Object.keys(material).length > 0 }).toEqual({ cardId, constrained: true });
        }
      }
    }
  });
});

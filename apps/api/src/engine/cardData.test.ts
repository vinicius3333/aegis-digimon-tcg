import { describe, it, expect } from "vitest";
import { getCardDefinition } from "@aegis/shared";

// DATA-01 guardrail: a pure card-data assertion (no engine play, no cards barrel).
//
// Before the fix, the card-data import sourced OptionCardColorRequirements from
// fields.* — always undefined for this field, because the parser routes the inline
// hex scalar into lists[]. So optionColorRequirements was
// undefined for EVERY option card that carries a color requirement.
//
// This reads the populated optionColorRequirements directly. It fails with `undefined`
// against the broken cards.json, and fails again if the import ever regresses to
// reading fields.* instead of lists.OptionCardColorRequirements?.[0].
describe("DATA-01 OptionCardColorRequirements is sourced from lists[], not fields.*", () => {
  it("decodes the dual-color requirement for both fixtures", () => {
    // BT25-104 raw 0000000002000000 -> [0,2] -> [Red, Yellow]
    expect(getCardDefinition("BT25-104")?.optionColorRequirements).toEqual([
      "Red",
      "Yellow",
    ]);
    // ST24-07 raw 0200000000000000 -> [2,0] -> [Yellow, Red]
    expect(getCardDefinition("ST24-07")?.optionColorRequirements).toEqual([
      "Yellow",
      "Red",
    ]);
  });

  it("omits the field for an Option with no color requirement", () => {
    // BT1-090 has an empty OptionCardColorRequirements (the [] / no-requirement
    // path, the common case for every non-color-gated Option). decodeEnumList("")
    // -> [] -> length 0 -> field omitted. The None sentinel (07000000) takes the
    // same route: [7] -> ["None"] -> filtered out -> [] -> omitted. A regression
    // that emitted optionColorRequirements: [] or ["None"] for plain Options would
    // fail here, mirroring how `colors` never carries None.
    const def = getCardDefinition("BT1-090");
    expect(def?.kinds).toContain("Option");
    expect(def?.optionColorRequirements).toBeUndefined();
  });
});

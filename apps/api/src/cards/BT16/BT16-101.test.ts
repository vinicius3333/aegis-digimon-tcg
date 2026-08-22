import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-101.js";

describe("BT16-101", () => {
  it("models Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("suspends all opposing Digimon and may attack on digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "Suspend", target: { count: "all" } });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "Attack",
      optional: true,
      withoutSuspending: false,
    });
  });

  it("gives suspended opposing Digimon -4000 DP with the Rapidmon/X Antibody condition and gains memory on deletion", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: -4000 }, while: { kind: "selfDigivolutionStackHasTrait" } },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [
            { kind: "GainMemory", amount: 2, condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
          ],
        },
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { deleteCause: "dpReachedZero" },
          actions: [
            { kind: "GainMemory", amount: 2, condition: { kind: "triggerRemovalCause", removalCause: "byRule" } },
          ],
        },
      ],
    });
  });
});

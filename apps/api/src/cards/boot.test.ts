import { describe, it, expect } from "vitest";
import { registeredCardCount, getEffectModule } from "../engine/effects/registry.js";

/**
 * Boot-registration integration test for the generated card modules.
 *
 * Importing the cards root barrel (apps/api/src/cards/index.ts) runs every set
 * barrel, which imports every generated + preserved card module; each self-registers
 * via `registerCard` / `registerIrCard`. `registerCard` THROWS on a duplicate cardId,
 * so a successful import proves the ~4,000-module graph has no id collision — in
 * particular that a declarative effect record module and a hand-authored override never both
 * register the same card. (The generator preserves overrides and skips generating a
 * file for those ids; this test is the runtime guarantee that the invariant holds.)
 */
describe("card boot registration (generated barrels)", () => {
  it("imports the full cards root barrel with no duplicate-registration throw", async () => {
    await expect(import("./index.js")).resolves.toBeDefined();
  }, 30_000);

  it("registers a large, sane number of card modules (generated + preserved)", async () => {
    await import("./index.js");
    // The generator reported ~3,974 generated + 8 preserved; assert we are in that
    // ballpark (a regression that drops registrations would fail here).
    expect(registeredCardCount()).toBeGreaterThan(3500);
  });

  it("preserves the hand-authored overrides (they register their own modules)", async () => {
    await import("./index.js");
    for (const id of ["BT1-001", "BT1-005", "BT1-084", "BT7-089", "BT7-102", "BT15-002", "AD1-010", "AD1-023"]) {
      expect(getEffectModule(id), `${id} (override) should be registered`).toBeDefined();
    }
  });
});

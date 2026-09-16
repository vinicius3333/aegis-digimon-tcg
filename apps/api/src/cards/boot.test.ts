import { describe, it, expect } from "vitest";
import { registeredCardCount, getEffectModule } from "../engine/effects/registry.js";

describe("card boot registration (generated barrels)", () => {
  it("imports the full cards root barrel with no duplicate-registration throw", async () => {
    await expect(import("./index.js")).resolves.toBeDefined();
  }, 30_000);

  it("registers a large, sane number of card modules (generated + preserved)", async () => {
    await import("./index.js");
    expect(registeredCardCount()).toBeGreaterThan(3500);
  });

  it("preserves the hand-authored overrides (they register their own modules)", async () => {
    await import("./index.js");
    for (const id of ["BT1-001", "BT1-005", "BT1-084", "BT7-089", "BT7-102", "BT15-002", "AD1-010", "AD1-023"]) {
      expect(getEffectModule(id), `${id} (override) should be registered`).toBeDefined();
    }
  });
});

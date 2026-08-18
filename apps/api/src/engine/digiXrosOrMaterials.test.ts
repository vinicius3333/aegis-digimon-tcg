import { describe, it, expect } from "vitest";
import { getCompiledCard } from "@aegis/shared";
// Self-register every compiled-IR card module so getCompiledCard resolves real definitions.
import "../cards/index.js";

/**
 * Regression for DigiXros OR-alternative material names dropped by the runtime record.
 *
 * Cards EX6-023 / EX6-024 / EX6-026 each have a "[DigiXros -2] [A] or [B] or [C]"
 * header; the runtime record only captured the first named material and dropped the OR
 * alternatives. Since `materialMatchesSlot` evaluates `names` as OR (any match passes),
 * the fix is to include all alternative names in `materials[0].names`.
 *
 * FAILS-WHEN-REVERTED: Restore `names:["Sanzomon"]` on any of these cards' digiXrosRequirement
 * => the non-primary alternatives become illegal materials => RED.
 */

describe("DigiXros OR-alternative materials are all present", () => {
  it("EX6-023 Gokuumon: accepts Sanzomon, Sagomon, Cho-Hakkaimon", () => {
    const card = getCompiledCard("EX6-023");
    expect(card).toBeDefined();
    const req = card!.digiXrosRequirement;
    expect(req).toBeDefined();
    expect(req!.length).toBeGreaterThan(0);
    const names = req![0]!.materials[0]!.names ?? [];
    expect(names).toContain("Sanzomon");
    expect(names).toContain("Sagomon");
    expect(names).toContain("Cho-Hakkaimon");
  });

  it("EX6-024 Sagomon: accepts Sanzomon, Gokuumon, Cho-Hakkaimon", () => {
    const card = getCompiledCard("EX6-024");
    expect(card).toBeDefined();
    const req = card!.digiXrosRequirement;
    expect(req).toBeDefined();
    const names = req![0]!.materials[0]!.names ?? [];
    expect(names).toContain("Sanzomon");
    expect(names).toContain("Gokuumon");
    expect(names).toContain("Cho-Hakkaimon");
  });

  it("EX6-026 Cho-Hakkaimon: accepts Sanzomon, Gokuumon, Sagomon", () => {
    const card = getCompiledCard("EX6-026");
    expect(card).toBeDefined();
    const req = card!.digiXrosRequirement;
    expect(req).toBeDefined();
    const names = req![0]!.materials[0]!.names ?? [];
    expect(names).toContain("Sanzomon");
    expect(names).toContain("Gokuumon");
    expect(names).toContain("Sagomon");
  });
});

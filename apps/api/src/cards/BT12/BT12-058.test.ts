import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-058.js";

describe("BT12-058 Zenimon", () => {
  it("carries its zero-cost Save-text alternate requirement", () => {
    expect(getEffectModule("BT12-058")?.cardId).toBe("BT12-058");
    expect(digivolutionRequirementsFor("BT12-058")).toContainEqual(
      expect.objectContaining({
        level: 2,
        texts: ["Save"],
        cost: 0,
        isAlternate: true,
      }),
    );
  });

  it("digivolves for zero from a level 2 Digimon with Save in its text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-005", as: "saveBase" }],
        hand: [{ card: "BT12-058", as: "zenimon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("saveBase").permanentId,
        instanceId: s.inst("zenimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("saveBase").topCard.cardId === "BT12-058");
    expect(s.state.memory).toBe(0);
  });

  it("rejects a level 2 Digimon without Save in its text", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-001", as: "plainBase" }],
        hand: [{ card: "BT12-058", as: "zenimon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainBase").permanentId,
        instanceId: s.inst("zenimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

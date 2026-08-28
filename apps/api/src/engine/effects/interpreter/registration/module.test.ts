import { afterEach, describe, expect, it } from "vitest";
import { compiledEffects, digiXrosRequirementFor } from "@aegis/shared";
import { getEffectModule, unregisterCard } from "../../registry.js";
import { registerIrCard } from "./module.js";

const CARD_ID = "REGISTRATION-IR-TEST";

afterEach(() => {
  unregisterCard(CARD_ID);
  delete compiledEffects[CARD_ID];
});

describe("registerIrCard", () => {
  it("builds and registers the compiled module without an undefined implementation override", () => {
    const module = registerIrCard(CARD_ID, { effects: [], coverage: "none", residual: [] });

    expect(module.cardId).toBe(CARD_ID);
    expect(getEffectModule(CARD_ID)).toBe(module);
  });

  it("publishes the direct module's normalized structural requirements to shared rule readers", () => {
    registerIrCard(CARD_ID, {
      effects: [],
      coverage: "full",
      residual: [],
      digiXrosRequirement: [{ materials: [{ traits: ["Save"] }], count: 2 }],
    });

    expect(digiXrosRequirementFor(CARD_ID)).toEqual([{ materials: [{ traits: ["Save"] }], count: 2 }]);
  });
});

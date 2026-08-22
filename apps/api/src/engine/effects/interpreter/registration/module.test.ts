import { afterEach, describe, expect, it } from "vitest";
import { getEffectModule, unregisterCard } from "../../registry.js";
import { registerIrCard } from "./module.js";

const CARD_ID = "REGISTRATION-IR-TEST";

afterEach(() => {
  unregisterCard(CARD_ID);
});

describe("registerIrCard", () => {
  it("builds and registers the compiled module without an undefined implementation override", () => {
    const module = registerIrCard(CARD_ID, { effects: [] });

    expect(module.cardId).toBe(CARD_ID);
    expect(getEffectModule(CARD_ID)).toBe(module);
  });
});

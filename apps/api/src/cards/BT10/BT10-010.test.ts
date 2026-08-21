import { describe, expect, it } from "vitest";
import { requireCardDefinition } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT10-010.js";

describe("BT10-010 Asuramon", () => {
  it("is playable as a vanilla level 5 red Digimon with no triggered effects", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-010", as: "asuramon" }] } });
    await s.ready();
    const card = s.inst("asuramon");
    const definition = requireCardDefinition(card.cardId);
    expect(card.cardId).toBe("BT10-010");
    expect(definition.level).toBe(5);
    expect(definition.colors).toEqual(["Red"]);
    expect(definition.playCost).toBe(7);
    expect(definition.dp).toBe(8000);
    expect(definition.effectText ?? "").not.toContain("[On Play]");
  });
});

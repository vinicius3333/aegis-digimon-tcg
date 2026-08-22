import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT10-017.js";

describe("BT10-017 Bulucomon", () => {
  it("has no effects and exposes the printed level, cost, DP, and color", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-017", as: "bulucomon" }] } });
    await s.ready();
    const card = s.inst("bulucomon");
    expect(card.cardId).toBe("BT10-017");
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === card.instanceId)).toBe(true);
    const definition = getCardDefinition(card.cardId)!;
    expect(definition.level).toBe(3);
    expect(definition.colors).toEqual(["Blue"]);
    expect(definition.playCost).toBe(2);
    expect(definition.dp).toBe(5000);
    expect(definition.effectText).toBeUndefined();
  });
});

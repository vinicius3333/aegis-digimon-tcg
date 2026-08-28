import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-017.js";

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
    expect(definition.forms).toEqual(["Rookie"]);
    expect(definition.attributes).toEqual(["Data"]);
    expect(definition.types).toEqual(["Mini Dragon"]);
    expect(definition.evoCosts).toEqual([{ color: "Blue", level: 2, memoryCost: 2 }]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 2 and digivolves from a blue level 2 for 2 without opening an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-002", as: "base" }],
        hand: [
          { card: "BT10-017", as: "evolving" },
          { card: "BT10-017", as: "playing" },
        ],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("playing").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

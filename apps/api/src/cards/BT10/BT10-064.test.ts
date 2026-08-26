import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-064.js";
describe("BT10-064 Gogmamon", () => {
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-064")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Black"], 5, 5, 8000, undefined]);
    expect(d.evoCosts).toEqual([{ color: "Black", level: 4, memoryCost: 3 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Ultimate"], ["Vaccine"], ["Rock"]]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 5 and digivolves from black level 4 for 3 without an effect decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-062", as: "base" }],
        hand: [
          { card: "BT10-064", as: "evolving" },
          { card: "BT10-064", as: "playing" },
        ],
      },
    });
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-064");
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

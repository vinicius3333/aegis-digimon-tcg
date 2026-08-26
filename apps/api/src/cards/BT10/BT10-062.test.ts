import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-062.js";
describe("BT10-062 Golemon", () => {
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-062")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Black"], 4, 5, 5000, undefined]);
    expect(d.evoCosts).toEqual([{ color: "Black", level: 3, memoryCost: 1 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Champion"], ["Virus"], ["Mineral"]]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 5 and digivolves from black level 3 for 1 without an effect decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-058", as: "base" }],
        hand: [
          { card: "BT10-062", as: "evolving" },
          { card: "BT10-062", as: "playing" },
        ],
      },
    });
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-062");
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

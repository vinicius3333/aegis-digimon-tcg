import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-055.js";
describe("BT10-055 Gryphonmon", () => {
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-055")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Green", "Yellow"], 6, 10, 13000, undefined]);
    expect(d.evoCosts).toEqual([
      { color: "Green", level: 5, memoryCost: 3 },
      { color: "Yellow", level: 5, memoryCost: 3 },
    ]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Mega"], ["Data"], ["Mythical Beast"]]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("digivolves from either printed color for 3 and plays directly for 10", async () => {
    for (const baseCard of ["BT10-054", "BT10-037"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "BT10-055", as: "evolving" }] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT10-055");
      expect(s.state.memory).toBe(0);
    }

    const played = setupEngine({ 0: { hand: [{ card: "BT10-055", as: "source" }] } });
    played.state.memory = 10;
    expect(played.engine.applyIntent(0, { type: "playCard", instanceId: played.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => played.state.players[0]!.battleArea.length === 1);
    expect(played.state.memory).toBe(0);
    expect(played.state.pendingDecision).toBeUndefined();
  });
});

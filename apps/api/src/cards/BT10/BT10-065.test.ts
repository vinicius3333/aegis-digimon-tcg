import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-065.js";
describe("BT10-065 Assaultmon", () => {
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-065")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Black"], 5, 7, 10000, undefined]);
    expect(d.evoCosts).toEqual([{ color: "Black", level: 4, memoryCost: 3 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Ultimate"], ["Virus"], ["Cyborg"]]);
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 7 and digivolves from black level 4 for 3 without an effect decision", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-062", as: "base" }],
        hand: [
          { card: "BT10-065", as: "evolving" },
          { card: "BT10-065", as: "playing" },
        ],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-065");
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playing").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

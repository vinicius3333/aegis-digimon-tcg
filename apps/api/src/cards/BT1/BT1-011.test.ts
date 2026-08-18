import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-011.js";

describe("BT1-011 Agumon Expert", () => {
  it("returns an Agumon Digimon from trash to hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-011", as: "expert" }], trash: [
      { card: "BT1-010", as: "agumon" }, { card: "BT1-012", as: "other" },
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const agumonId = s.inst("agumon").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === agumonId));

    expect(player.trash.map((card) => card.instanceId)).not.toContain(agumonId);
    expect(player.trash.map((card) => card.instanceId)).toContain(s.inst("other").instanceId);
  });

  it("matches a Digimon whose longer name contains Agumon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-011", as: "expert" }], trash: [{ card: "BT6-018", as: "bond" }] },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    const bondId = s.inst("bond").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("expert").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === bondId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bondId)).toBe(true);
  });
});

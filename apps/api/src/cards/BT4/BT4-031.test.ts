import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-031.js";

describe("BT4-031 MarinChimairamon", () => {
  it("returns another own Digimon as cost and an opposing Digimon without sources", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-031", as: "source" }], battleArea: [
      { card: "BT4-026", as: "cost", under: ["BT4-024"] },
    ] }, 1: { battleArea: [{ card: "BT4-025", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const mine = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    const costId = s.perm("cost").permanentId;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => !mine.battleArea.some((p) => p.permanentId === costId) && opponent.battleArea.length === 0);
    expect(mine.hand.some((card) => card.cardId === "BT4-026")).toBe(true);
    expect(mine.trash.some((card) => card.cardId === "BT4-024")).toBe(true);
  });
});

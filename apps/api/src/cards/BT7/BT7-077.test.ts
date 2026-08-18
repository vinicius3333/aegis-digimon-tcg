import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-077.js";

describe("BT7-077 Nidhoggmon", () => {
  it("trashes a hand card to delete an opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-012", as: "base" }], hand: [{ card: "BT7-077", as: "evolving" }, { card: "BT1-009", as: "cost" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const mine = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(mine.trash.some(card => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});

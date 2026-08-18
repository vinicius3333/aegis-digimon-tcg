import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-009.js";

describe("BT9-009 Guilmon (X Antibody)", () => {
  it("deletes an opposing 3000-DP-or-less Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "BT9-009", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-010", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some(card => card.cardId === "BT1-010")).toBe(true);
  });
});

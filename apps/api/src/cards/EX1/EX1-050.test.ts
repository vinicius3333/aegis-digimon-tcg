import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-050.js";

describe("EX1-050 MetalMamemon", () => {
  it("adds a level 6 Machine and trashes the other revealed cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-047", as: "base" }], hand: [{ card: "EX1-050", as: "evo" }], deck: ["BT11-072", "BT1-009", "BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072"));
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("deletes an opposing Digimon with play cost 5 or less when a Machine host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-042", as: "host", under: ["EX1-050"] }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-001", "BT1-001"] } }, { autoSelectCards: true });
    const targetId = s.perm("target").topCard.instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

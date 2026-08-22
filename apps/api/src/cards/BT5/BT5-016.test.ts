import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-016.js";

describe("BT5-016 WarGreymon", () => {
  it("deletes a Blocker with a qualifying Greymon source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-015", as: "base" }], hand: [{ card: "BT5-016", as: "evolving" }] }, 1: { battleArea: ["BT5-062"] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("its inherited When Attacking deletes a 3000-DP-or-less opponent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-019", as: "host", under: ["BT5-016"] }] }, 1: { battleArea: [{ card: "BT5-059", as: "target", dp: 3000 }], security: ["BT5-001"] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not use an excluded Greymon source to delete a Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-015", as: "base", under: ["BT4-013"] }], hand: [{ card: "BT5-016", as: "evolving" }] }, 1: { battleArea: ["BT5-062"] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-016");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

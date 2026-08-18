import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-010.js";

describe("BT8-010 Aquilamon", () => {
  it("costs 1 less to play while you have a yellow Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT8-008", "BT8-034"], hand: [{ card: "BT8-010", as: "aquilamon" }] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("aquilamon").instanceId));
    expect(s.state.memory).toBe(2);
  });

  it("deletes a 5000-DP-or-lower Digimon when its host attacks while you have a yellow Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-010"] }, "BT8-034"] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-023", as: "target" }] },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

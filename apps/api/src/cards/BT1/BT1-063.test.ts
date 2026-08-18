import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-063.js";
describe("BT1-063 Seraphimon", () => {
  it("recovers the top deck card when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-059", as: "base" }],
        hand: [{ card: "BT1-063", as: "evolving" }],
        deck: [
          { card: "BT1-010", as: "drawn" },
          { card: "BT1-049", as: "recovered" },
        ],
      },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.security.some((c) => c.instanceId === s.inst("recovered").instanceId));

    expect(player.deck).toHaveLength(0);
    expect(player.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(player.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it.each([
    { security: 2, amount: 0 },
    { security: 3, amount: 1 },
    { security: 6, amount: 1 },
  ])("grants Security Attack +$amount with $security security on its owner's turn", async ({ security, amount }) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-063", as: "seraphimon" }], security } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("seraphimon"), "SecurityAttack")).toBe(amount);
  });

  it("does not grant Security Attack during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-063", as: "seraphimon" }], security: 6 } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("seraphimon"), "SecurityAttack")).toBe(0);
  });
});

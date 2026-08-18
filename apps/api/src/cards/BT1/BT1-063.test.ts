import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-063.js";
describe("BT1-063 Seraphimon", () => {
  it("recovers the top deck card when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-059", as: "base" }], hand: [{ card: "BT1-063", as: "evolving" }], deck: [{ card: "BT1-010", as: "recovered" }] } });
    const player=s.state.players[0] as PlayerState; s.state.memory=3;
    expect(s.engine.applyIntent(0,{type:"digivolve",permanentId:s.perm("base").permanentId,instanceId:s.inst("evolving").instanceId})).toEqual({ok:true});
    await settle(()=>player.security.some(c=>c.instanceId===s.inst("recovered").instanceId));
    expect(player.deck).toHaveLength(0);
  });

  it("gains Security Attack +1 on its turn while its owner has at least 3 security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-063", as: "seraphimon" }], security: 3 } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("seraphimon"), "SecurityAttack")).toBe(true);
  });
});

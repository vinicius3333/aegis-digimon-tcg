import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-074.js";
describe("BT1-074 Togemon", () => {
  it("adds a revealed level 5 or higher Digimon when digivolving", async () => {
    const s=setupEngine({0:{battleArea:[{card:"BT1-067",as:"base"}],hand:[{card:"BT1-074",as:"evolving"}],deck:[{card:"BT1-075",as:"eligible"},"BT1-068","BT1-069"]}},{autoSelectCards:true});
    const p=s.state.players[0] as PlayerState;s.state.memory=2;
    expect(s.engine.applyIntent(0,{type:"digivolve",permanentId:s.perm("base").permanentId,instanceId:s.inst("evolving").instanceId})).toEqual({ok:true});
    await settle(()=>p.hand.some(c=>c.instanceId===s.inst("eligible").instanceId));
    expect(p.deck).toHaveLength(2);
  });
});

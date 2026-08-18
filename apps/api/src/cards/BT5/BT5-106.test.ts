import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT13/BT13-080.js";
import "./BT5-106.js";

describe("BT5-106 Demonic Disaster", () => {
  it("may delete one Digimon to unsuspend a purple Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-071", as: "cost" }, { card: "BT5-072", as: "target", suspended: true }], hand: [{ card: "BT5-106", as: "option" }] } }, { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds });
    const costPermanentId = s.perm("cost").permanentId;
    preferInstanceIds.push(s.perm("cost").topCard.instanceId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("target").isSuspended && !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costPermanentId));
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("security plays a level 3 purple Digimon from trash with On Play suppressed", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-106", as: "securityOption", faceUp: true }], trash: [{ card: "BT13-080", as: "played" }], deck: ["BT5-071"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});

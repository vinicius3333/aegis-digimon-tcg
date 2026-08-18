import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-047.js";

describe("BT2-047 Argomon", () => {
  it("may suspend one of its Digimon to reduce its digivolution cost by 3", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-044", as: "base" }, { card: "BT2-043", as: "payer" }], hand: [{ card: "BT2-047", as: "evolving" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("payer").topCard!.instanceId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("payer").isSuspended && s.perm("base").topCard?.cardId === "BT2-047");
    expect(s.state.memory).toBe(5);
    expect(s.perm("payer").isSuspended).toBe(true);
  });

  it("may play a level 3 green Digimon suspended when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-047", as: "attacker", under: ["BT2-047"] }], hand: [{ card: "BT2-043", as: "played" }] }, 1: { security: ["BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId));
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId)!;
    expect(played.isSuspended).toBe(true);
  });
});

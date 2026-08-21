import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-035.js";

describe("BT18-035 Piddomon", () => {
  it("plays this exact security card without cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT18-035", as: "piddomon", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("piddomon"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("piddomon").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("piddomon").instanceId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("piddomon").instanceId)).toBe(false);
  });

  it("reduces an opponent Digimon's DP by exactly 2000 through the inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-035"] }] },
      1: { battleArea: [{ card: "BT1-030", as: "target", dp: 4000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const target = s.perm("target");

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => target.currentDP === 2000);

    expect(target.currentDP).toBe(2000);
  });
});

import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import { compiled } from "./BT18-089.js";

describe("BT18-089 Tommy Himi", () => {
  it("covers the paid Hybrid memory gain and inherited bottom-card trash followed by conditional draw", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash" } }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: false, target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } } }, { kind: "Draw", amount: 1, condition: { kind: "opponentHasNone" } }] });
  });

  it("plays from Security without cost through the real security timing", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT18-089", as: "tommy", faceUp: true }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tommy"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tommy").instanceId)).toBe(true);
  });
});

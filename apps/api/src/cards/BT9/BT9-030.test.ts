import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-030.js";

describe("BT9-030 MetalPiranimon", () => {
  it("may play a Piranimon from its digivolution cards when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-030", as: "metal", under: [{ card: "BT9-026", as: "piranimon" }] }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const materialId = s.perm("metal").stack[0]!.instanceId;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("metal"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === materialId)).toBe(true);
  });
});

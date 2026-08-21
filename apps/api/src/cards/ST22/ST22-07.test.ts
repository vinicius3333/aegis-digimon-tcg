import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-07 Rika Nonaka", () => {
  it("places an eligible Option under itself, draws, and gains memory on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-07", as: "rika" }], hand: [{ card: "ST22-08", as: "option" }], deck: [{ card: "BT1-009", as: "drawn" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEnterFieldAnyone, s.perm("rika"));
    await settle(() => s.perm("rika").stack.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.perm("rika").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});

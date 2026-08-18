import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-022.js";

describe("BT5-022 Bulucomon", () => {
  it("gains 1 memory when your effect trashes an opponent's digivolution card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022"] }] }, 1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] } });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(s.perm("opponent").permanentId, [s.inst("source").instanceId], { byEffectSeat: 0 });
    await settle(() => s.state.memory !== before);
    expect(s.state.memory - before).toBe(1);
  });

  it("does not gain memory when the opponent trashes their own source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-028", as: "host", under: ["BT5-022"] }] }, 1: { battleArea: [{ card: "BT4-073", as: "opponent", under: [{ card: "BT1-009", as: "source" }] }] } });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    await (s.engine as any).primitives.trashDigivolutionCards(s.perm("opponent").permanentId, [s.inst("source").instanceId], { byEffectSeat: 1 });
    await settle();
    expect(s.state.memory).toBe(before);
  });
});

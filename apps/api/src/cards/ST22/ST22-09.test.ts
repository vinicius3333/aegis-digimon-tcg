import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST22-09 High-Speed Plug-In H", () => {
  it("restricts an opposing Digimon from suspending and adds itself to hand from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST22-09", as: "option", faceUp: true }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const option = s.inst("option").instanceId;
    const opponent = s.perm("opponent");
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === option));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === option)).toBe(true);
    expect(observe(s.engine).isRestricted(opponent, "suspend")).toBe(true);
  });
});

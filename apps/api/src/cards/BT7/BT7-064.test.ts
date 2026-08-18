import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-064.js";

describe("BT7-064 DoruGreymon", () => {
  it("places a black X-Antibody card from hand to protect its host and grant Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-065", under: ["BT7-064"], as: "host" }], hand: [{ card: "BT7-062", as: "placed" }] } }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "dpImmune")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("keeps its protection through the owner's turn and expires at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-065", under: ["BT7-064"], as: "host" }],
          hand: [{ card: "BT7-062", as: "placed" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { deck: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(true);

    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeleted")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("host"), "dpImmune")).toBe(false);
  });
});

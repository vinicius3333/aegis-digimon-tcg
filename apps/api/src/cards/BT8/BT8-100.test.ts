import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-100.js";

describe("BT8-100 Disaster Blaster", () => {
  it("gives -3000 DP without a multicolor Digimon card in play", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT8-034"], hand: [{ card: "BT8-100", as: "option" }] },
      1: { battleArea: [{ card: "BT8-017", as: "target" }] },
    }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== before);
    expect(s.perm("target").currentDP).toBe(before - 3000);
  });

  it("gives -6000 DP while a multicolor Digimon is in play", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT8-015"], hand: [{ card: "BT8-100", as: "option" }] },
      1: { battleArea: [{ card: "BT8-017", as: "target" }] },
    }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== before);
    expect(s.perm("target").currentDP).toBe(before - 6000);
  });

  it("activates the same conditional Main effect from security", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT8-015"], security: [{ card: "BT8-100", as: "security", faceUp: true }] },
      1: { battleArea: [{ card: "BT8-017", as: "target" }] },
    }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    expect(s.perm("target").currentDP).toBe(before - 6000);
  });

  it("does not combine two differently colored monocolor stack cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-007", under: ["BT1-009", "BT1-029"] }, "BT8-034"],
        hand: [{ card: "BT8-100", as: "option" }],
      },
      1: { battleArea: [{ card: "BT8-017", as: "target" }] },
    }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== before);

    expect(s.perm("target").currentDP).toBe(before - 3000);
  });
});

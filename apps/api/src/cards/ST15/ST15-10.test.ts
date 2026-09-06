import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-10 Andromon", () => {
  it("de-digivolves one opposing stack and inherits Reboot on the next host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-08", as: "base" }],
          hand: [
            { card: "ST15-10", as: "andromon" },
            { card: "ST15-13", as: "hia" },
          ],
        },
        1: { battleArea: [{ card: "ST15-12", as: "target", under: ["BT1-009", "ST15-08", "ST15-11"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.inst("andromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => target.topCard?.cardId === "ST15-11");

    expect(target.topCard?.cardId).toBe("ST15-11");
    expect(target.stack).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(base, "Reboot")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.inst("hia").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard.cardId === "ST15-13");
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(base, "Reboot")).toBe(true);
  });

  it("grants inherited Reboot to its evolved host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST15-13", as: "host", under: ["ST15-10"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("does not add Reboot to an unrelated Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "vanilla" }] } });
    await advance(s.engine).fire(EffectTiming.None, s.perm("vanilla"));
    expect(observe(s.engine).hasKeyword(s.perm("vanilla"), "Reboot")).toBe(false);
  });

  it("unsuspends its inherited Reboot host during the opponent's Active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-13", under: ["ST15-10"], as: "host", suspended: true }] },
      1: { deck: ["BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});

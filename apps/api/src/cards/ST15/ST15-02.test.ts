import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-02 Agumon", () => {
  it("gains 1 memory at the start of main phase when the opponent has a battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-02", as: "agumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("agumon"));
    expect(s.state.memory).toBe(1);
  });

  it("does not count an opponent's breeding-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-02", as: "agumon" }] },
      1: { breeding: { card: "BT1-009", as: "breeding" } },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("agumon"));
    expect(s.state.memory).toBe(0);
  });

  it("gains inherited memory once when any attack target switches", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", under: ["BT1-009", "ST15-02"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", { attackerPermanentId: s.perm("opponent").permanentId });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", { attackerPermanentId: s.perm("opponent").permanentId });
    expect(s.state.memory).toBe(1);
  });
});

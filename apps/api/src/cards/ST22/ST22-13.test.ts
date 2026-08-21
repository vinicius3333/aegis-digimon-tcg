import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-13 GrandGalemon", () => {
  it("suspends an opposing Digimon and gains 3000 DP on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-13", as: "grand" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const grand = s.perm("grand");
    const opponent = s.perm("opponent");
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, grand);
    await settle(() => grand.currentDP === 10000);
    expect(grand.isSuspended || opponent.isSuspended).toBe(true);
    expect(grand.currentDP).toBe(10000);
  });
});

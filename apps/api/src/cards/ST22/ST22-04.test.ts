import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-04 Taomon", () => {
  it("reduces one opposing Digimon by 3000 on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST22-04", as: "taomon" }] }, 1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.perm("opponent");
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("taomon"));
    await settle(() => opponent.currentDP === 4000);
    expect(opponent.currentDP).toBe(4000);
  });
});

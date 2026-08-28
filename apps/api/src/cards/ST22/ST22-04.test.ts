import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-04 Taomon", () => {
  it("reduces one opposing Digimon by 3000 on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-04", as: "taomon" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.perm("opponent");
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("taomon"));
    await settle(() => opponent.currentDP === 4000);
    expect(opponent.currentDP).toBe(4000);
  });

  it("also prevents that selected Digimon's When Digivolving effects until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-04", as: "taomon" },
            { card: "BT1-009", dp: 2000, as: "victim" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "opponent" }], hand: [{ card: "AD1-001", as: "evolver" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.perm("opponent");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("taomon"));
    await settle(() => opponent.currentDP === 4000);
    expect(opponent.currentDP).toBe(4000);

    s.state.turnSeat = 1;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: opponent.permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.topCard?.cardId === "AD1-001");

    // AD1-001 would delete the opposing 2000-DP Digimon on [When Digivolving].
    // Taomon's restriction is proven by that Digimon remaining in the battle area.
    expect(s.perm("victim").currentDP).toBe(2000);
  });
});

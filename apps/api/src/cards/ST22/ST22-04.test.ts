import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { observe } from "../../engine/testkit/observe.js";

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
  it("pays the top security once to unsuspend its Sakuyamon host after a completed attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-06", as: "host", under: ["ST22-04"] }],
          security: [{ card: "ST1-02", as: "cost" }, "ST1-03"],
        },
        1: { security: ["ST1-02", "ST1-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && !s.perm("host").isSuspended);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(true);
  });
});

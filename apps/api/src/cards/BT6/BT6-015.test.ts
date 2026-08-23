import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-015.js";

describe("BT6-015 SaviorHuckmon", () => {
  it("plays a Sistermon from hand for free when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "base" }],
          hand: [
            { card: "BT6-015", as: "evolving" },
            { card: "BT6-084", as: "sistermon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sistermonId = s.inst("sistermon").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === sistermonId),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sistermonId)).toBe(false);
  });

  it("its inherited effect unsuspends the host only once per turn and enables exactly one reattack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-016", as: "host", under: ["BT6-015"] }, "BT6-082"] },
        1: { security: ["BT6-074", "BT6-076", "BT6-074", "BT6-076", "BT6-074", "BT6-076"] },
      },
      { autoSelectCards: true },
    );
    const host = s.perm("host");
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "combatResolved") &&
        !host.isSuspended &&
        !observe(s.engine).hasAttackedThisTurn(host),
      5000,
    );

    expect(observe(s.engine).hasAttackedThisTurn(host)).toBe(false);

    host.isSuspended = true;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, host);
    expect(host.isSuspended).toBe(true);
  });
});

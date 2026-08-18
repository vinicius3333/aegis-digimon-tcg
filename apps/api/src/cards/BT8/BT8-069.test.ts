import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-069.js";

describe("BT8-069 Ouryumon", () => {
  it("places an X Antibody card from hand as its bottom source to delete a play-cost-7-or-less Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT8-069", as: "evolving" }, { card: "BT8-060", as: "cost" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-069"));
    expect(s.perm("base").stack[0]?.instanceId).toBe(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("unsuspends an Alphamon host at the end of its attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT6-111",
          as: "alphamon",
          suspended: true,
          under: ["BT8-069"],
        }],
      },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("alphamon"));

    expect(s.perm("alphamon").isSuspended).toBe(false);
  });

  it("unsuspends an Alphamon host through the real combat end window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-066", as: "alphamon", under: ["BT8-069"] }],
      },
      1: { security: ["BT1-001"] },
    });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("alphamon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 0 &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking
    );

    expect(s.perm("alphamon").isSuspended).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST16-06.js";

describe("ST16-06 Bakemon", () => {
  it("surfaces its printed Blocker keyword on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-06", as: "bakemon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("bakemon"), "Blocker")).toBe(true);
  });

  it("redirects a real player attack when the blocker is declared", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-03", as: "attacker" }] },
      1: { battleArea: [{ card: "ST16-06", as: "blocker" }], security: ["BT1-001"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === blockerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

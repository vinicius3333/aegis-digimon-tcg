import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-04.js";

describe("ST7-04 Biyomon", () => {
  it("has Blocker and cannot attack players on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST7-04", as: "biyomon" }] }, 1: { security: ["ST7-01"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("biyomon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("biyomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("redirects an opposing player attack through its Blocker window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-04", as: "biyomon" }], security: ["ST7-01"] },
        1: { battleArea: [{ card: "ST7-02", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("biyomon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("biyomon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

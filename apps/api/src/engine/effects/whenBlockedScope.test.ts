import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

// ST1-09 MetalGreymon's inherited "[Your Turn] When this Digimon is blocked, gain 3 memory" is
// the probe. OnBlockAnyone is broadcast board-wide, so the effect must bind to the blocked
// attacker itself, not to any Digimon its controller happens to own.
describe("[When Blocked] binds to the blocked attacker", () => {
  it("does not activate on another Digimon of mine being blocked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "attacker", dp: 3000 },
          { card: "BT1-011", as: "host", under: ["ST1-09"] },
        ],
      },
      1: { battleArea: [{ card: "ST1-06", as: "blocker" }], security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(0);
  });

  it("still activates when the host itself is blocked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-011", as: "host", under: ["ST1-09"] }] },
      1: { battleArea: [{ card: "ST1-06", as: "blocker" }], security: ["BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);

    expect(s.state.memory).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

// BT19-017 Sangomon's inherited "[End of Attack][Once Per Turn] Gain 1 memory" is the probe:
// unconditional, so any activation is visible on the memory counter. Comprehensive Rules
// §15-16-15-1: [End of Attack] triggers only when the attack was performed using the card
// carrying the effect.
describe("[End of Attack] binds to the attacking permanent", () => {
  it("does not activate the opponent's inherited End of Attack when I attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT19-019", as: "host", under: ["BT19-017"] }], security: ["BT1-001"] },
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
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(0);
  });

  it("does not activate my other Digimon's inherited End of Attack when a different Digimon of mine attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", as: "attacker" },
          { card: "BT19-019", as: "host", under: ["BT19-017"] },
        ],
      },
      1: { security: ["BT1-001"] },
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
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(0);
  });

  it("still activates the attacker's own inherited End of Attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-019", as: "host", under: ["BT19-017"] }] },
      1: { security: ["BT1-001"] },
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
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });
});

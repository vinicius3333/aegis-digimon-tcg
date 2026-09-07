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

describe("EndOfAttack source scope", () => {
  it("does not resolve BT21-079's End of Attack effect from a nonattacking own host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-079", as: "ownHost" },
            { card: "BT21-011", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-001"], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ownHostId = s.perm("ownHost").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved")).toBe(true);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ownHostId)).toBe(true);
  });

  it("does not resolve a BT21-079 host's End of Attack effect for an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-011", as: "attacker" }], deck: ["BT1-009", "BT1-009"] },
        1: {
          battleArea: [{ card: "BT21-079", as: "opponentHost" }],
          security: ["BT1-001"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const opponentHostId = s.perm("opponentHost").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved")).toBe(true);
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === opponentHostId)).toBe(true);
  });

  it("does not resolve BT21-079's End of Attack effect when it is the defender against Armor Purge", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-035", as: "armorAttacker", under: ["BT8-012"] }],
          security: ["BT1-002"],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT21-079", as: "defender", suspended: true }],
          security: ["BT1-001"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const defenderId = s.perm("defender").permanentId;
    const armorAttackerId = s.perm("armorAttacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: armorAttackerId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defenderId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === armorAttackerId)).toBe(true);
  });

  it("resolves BT21-079's own End of Attack deletion after its public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-079", as: "attacker" }], security: ["BT1-001"], deck: ["BT1-009", "BT1-009"] },
        1: { security: ["BT1-002", "BT1-003", "BT1-004"], deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved") &&
        !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.some((event) => event.kind === "securityChecked" || event.kind === "combatResolved")).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-079")).toBe(true);
    expect(s.state.players[1]!.security.length).toBeGreaterThan(0);
  });
});

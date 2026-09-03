import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-008.js";

describe("EX1-008 MetalGreymon", () => {
  it("deletes an opposing Digimon with 4000 DP or less when attacking a player", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "small", dp: 4000 },
            { card: "BT1-011", as: "large", dp: 5000 },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const smallId = s.perm("small").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === smallId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete an opposing Digimon when the attack targets a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000, suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("grants inherited Piercing to a Machine host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-042", as: "machine", under: ["EX1-008"] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("machine"))).toBe(true);
  });

  it("grants inherited Piercing through the Dragonkin alternative", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-025", as: "dragon", under: ["EX1-008"] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("dragon"))).toBe(true);
  });

  it("limits inherited Piercing to your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-042", as: "machine", under: ["EX1-008"] }] }, 1: { battleArea: [{ card: "BT1-070" }] } });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("machine"))).toBe(false);
  });

  it("uses real battle resolution to pierce security after attacking a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-042", as: "attacker", under: ["EX1-008"] }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", dp: 3000, suspended: true }], security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("target").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });
});

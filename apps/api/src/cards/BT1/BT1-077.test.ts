import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-077.js";

describe("BT1-077 Okuwamon", () => {
  it("gains 1 memory when its Digimon deletes an opponent in battle and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 10000, under: ["BT1-077"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "defender", dp: 1000, suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when both Digimon are deleted in a tied battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 6000, under: ["BT1-077"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "defender", dp: 6000, suspended: true }] },
    });
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory from a security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 10000, under: ["BT1-077"] }] },
      1: { security: ["BT1-016"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
  });

  it("does not apply while Okuwamon is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-077", as: "attacker", dp: 10000 }] },
      1: { battleArea: [{ card: "BT1-016", as: "defender", dp: 1000, suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
  });
});

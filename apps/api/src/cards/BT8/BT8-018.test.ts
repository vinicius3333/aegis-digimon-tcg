import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-018.js";
import "../EX8/EX8-016.js";
import "../EX11/EX11-011.js";

describe("BT8-018 Marsmon", () => {
  it("can attack an opponent's unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-018", as: "marsmon" }] },
      1: { battleArea: [{ card: "BT8-034", as: "target" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("cannot override a suspended Dinomon restricting attacks to suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-018", as: "marsmon" }] },
      1: {
        battleArea: [
          { card: "EX8-016", as: "dinomon", suspended: true },
          { card: "BT8-034", as: "unsuspendedTarget" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspendedTarget").permanentId },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));

    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("digivolves from a red level-5 Digimon for 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: "BT8-018", as: "marsmon" }] },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("marsmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-018");

    expect(s.perm("base").topCard.cardId).toBe("BT8-018");
    expect(s.state.memory).toBe(1);
  });
});

describe("BT8-018 Marsmon — KB Q&A rulings", () => {
  async function marsmonAttackOnUnsuspendedDigimon(dinomonCardId: string, dinomonSuspended: boolean) {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-018", as: "marsmon" }] },
      1: {
        battleArea: [
          { card: dinomonCardId, as: "dinomon", suspended: dinomonSuspended },
          { card: "BT8-034", as: "unsuspendedTarget" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("marsmon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("unsuspendedTarget").permanentId },
    });
    return { s, result };
  }

  it("cannot attack an unsuspended Digimon while the opponent's EX8-016 Dinomon is suspended (Q3878)", async () => {
    const control = await marsmonAttackOnUnsuspendedDigimon("EX8-016", false);
    expect(control.result).toEqual({ ok: true });

    const { s, result } = await marsmonAttackOnUnsuspendedDigimon("EX8-016", true);
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("cannot attack an unsuspended Digimon while the opponent's EX11-011 Dinomon is suspended (Q5797)", async () => {
    const control = await marsmonAttackOnUnsuspendedDigimon("EX11-011", false);
    expect(control.result).toEqual({ ok: true });

    const { s, result } = await marsmonAttackOnUnsuspendedDigimon("EX11-011", true);
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});

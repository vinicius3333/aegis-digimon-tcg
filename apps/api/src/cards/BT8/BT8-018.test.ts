import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-018.js";
import "../EX8/EX8-016.js";

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
});

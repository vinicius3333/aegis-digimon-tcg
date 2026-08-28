import { describe, expect, it } from "vitest";
import { Phase, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-055.js";

describe("BT8-055 Climbmon", () => {
  it("returns a suspended opposing Digimon with no more DP when this Digimon is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-069", as: "base", suspended: true }],
          hand: [{ card: "BT8-055", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.hand.some((card) => card.cardId === "BT2-047"));
    expect(opponent.battleArea).toHaveLength(0);
  });

  it("inherits suspending an opponent when its host unsuspends in the active phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-057", as: "host", under: ["BT8-055"], suspended: true }] },
        1: { battleArea: [{ card: "BT8-034", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Active;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not inherit the suspension from a main-phase unsuspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-057", as: "host", under: ["BT8-055"], suspended: true }] },
        1: { battleArea: [{ card: "BT8-034", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Main;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle();

    expect(s.perm("target").isSuspended).toBe(false);
  });
});

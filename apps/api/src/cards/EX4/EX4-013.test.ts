import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-013.js";
import "../index.js";

describe("EX4-013 MedievalGallantmon", () => {
  it("routes the Security clause through the security timing", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true });
  });
  it("plays from security without cost and schedules a return to hand at end of turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions).toEqual([
      expect.objectContaining({ kind: "PlayWithoutCost", from: ["security"], payCost: false }),
      expect.objectContaining({ kind: "Return", to: "hand", scheduling: "endOfTurn" }),
    ]);
  });
  it("falls back to suspending an opponent Digimon when the 6000 DP deletion fails", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
      });
      expect(actions[1]).toMatchObject({
        kind: "Suspend",
        preventUnsuspend: "opponentNextUnsuspendPhase",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
    }
  });

  it("deletes an opposing Digimon at or below 6000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-013", as: "medieval" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("medieval"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("suspends and prevents unsuspension when no eligible Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-013", as: "medieval" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("medieval"));

    expect(s.perm("target").isSuspended).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});

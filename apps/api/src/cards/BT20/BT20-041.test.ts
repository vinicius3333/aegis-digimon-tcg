import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-041.js";
import "./index.js";

describe("BT20-041 Crowmon", () => {
  it("suspends an opponent, buffs one of yours, and optionally attacks on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
          {
            kind: "ModifyDP",
            target: { filter: { controller: "mine", kind: ["Digimon"] } },
            amount: 3000,
            duration: "forTheTurn",
          },
          { kind: "Attack", optional: true },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });

  it("on play suspends the opponent, gains +3000 DP, and takes the optional attack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-041", as: "crowmon" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 6000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crowmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("crowmon").isSuspended).toBe(true);
    expect(s.perm("crowmon").currentDP).toBe(9000);
  });

  it("inherits a once-per-turn -4000 DP When Attacking effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-042", dp: 7000, under: ["BT20-041"], as: "host" }] },
        1: { battleArea: [{ card: "BT20-010", dp: 6000, suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT20-010")).toBe(true);
  });
});

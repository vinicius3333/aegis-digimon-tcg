import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-091.js";

describe("BT1-091 Scrap Claw", () => {
  it("gives exactly 1 of your Digimon Piercing and performs the security check after winning battle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 5000 },
            { card: "BT1-011", as: "other" },
          ],
          hand: [{ card: "BT1-091", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "defender", dp: 1000, suspended: true }],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("target")));

    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);
  });

  it("removes the granted Piercing at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          hand: [{ card: "BT1-091", as: "option" }],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("target")));
    await advance(s.engine).runTurn(0);

    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(false);
  });
});

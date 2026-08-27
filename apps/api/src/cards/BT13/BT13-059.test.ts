import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-059.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-059 Examon", () => {
  it("keeps DNA materials, same-target unsuspend restriction, and the once-per-turn modal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.dnaDigivolveRequirement).toContainEqual(
      expect.objectContaining({ cost: 4, materials: [{ names: ["Slayerdramon"] }, { names: ["Breakdramon"] }] }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: expect.arrayContaining([expect.objectContaining({ kind: "Suspend" })]),
    });
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions).toEqual([
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
        },
      ]);
    }
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [expect.objectContaining({ kind: "Modal", choose: 1, optional: true })],
        }),
      ],
    });
  });

  it("suspends an opponent Digimon on play and keeps the selected target restricted", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-059", as: "examon" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("examon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended, 3000);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-084.js";

describe("BT22-084 Nokia Shiramine", () => {
  it("limits both Agumon/Gabumon plays to one or fewer own Digimon", () => {
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        optional: true,
        target: {
          filter: { controller: "mine", nameOrTrait: [{ tokens: ["Agumon", "Gabumon"], match: "name" }] },
          count: 1,
        },
        condition: { kind: "permanentCount", filter: { controller: "mine", kind: ["Digimon"] }, op: "lte", value: 1 },
      });
    }
  });

  it("sets memory, buffs named Digimon, and plays itself from security", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { count: "all" },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });

  it("plays Agumon free on Nokia's public On Play resolution at the one-Digimon boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-084", as: "nokia" },
            { card: "BT1-010", as: "agumon" },
          ],
          battleArea: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const nokiaId = s.inst("nokia").instanceId;
    const agumonId = s.inst("agumon").instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: nokiaId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === agumonId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === agumonId)).toBe(true);
  });
});

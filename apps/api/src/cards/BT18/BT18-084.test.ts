import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-084.js";

describe("BT18-084 AncientSphinxmon", () => {
  it("deletes only an opponent's unsuspended Digimon and preserves the leave-play replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", unsuspended: true, kind: ["Digimon"] } } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Dark Animal", "Mythical Beast", "Hybrid"], match: "trait" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("executes the On Play unsuspended-target boundary through the GameEngine", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-084", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "live" },
            { card: "BT1-009", as: "suspended", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    const liveId = s.perm("live").permanentId;
    const suspendedId = s.perm("suspended").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === liveId));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === suspendedId)).toBe(true);
  });
});

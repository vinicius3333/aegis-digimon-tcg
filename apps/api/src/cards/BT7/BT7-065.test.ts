import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-065.js";

describe("BT7-065 Dorugoramon", () => {
  it("records Once Per Turn attack placement and source-stack play-cost scaling", () => {
    const card = runtimeCompiledCard("BT7-065");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "YourTurn", actions: [{ kind: "ModifyDP", scaling: { per: 1, unit: "digivolutionCards" } }] },
        {
          trigger: "WhenAttacking",
          frequency: "OncePerTurn",
          actions: [
            { kind: "PlaceUnder", target: { from: ["hand"], count: 1 } },
            { kind: "Delete", target: { count: 2, upTo: true, filter: { playCostLteScaling: { per: 1, unit: "digivolutionCards" } } } },
          ],
        },
      ],
    });
  });

  it("places an X-Antibody card from hand to delete up to 2 Digimon within its source-count play-cost limit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-065", under: ["BT7-005", "BT7-056", "BT7-058", "BT7-064"], as: "dorugoramon" }],
          hand: [{ card: "BT7-056", as: "placed" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target1" },
            { card: "BT1-011", as: "target2" },
          ],
          security: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorugoramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("dorugoramon").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
  });
});

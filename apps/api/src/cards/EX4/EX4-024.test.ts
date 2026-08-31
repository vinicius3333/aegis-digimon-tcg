import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-024.js";

describe("EX4-024 Renamon", () => {
  it("prevents two opposing Digimon at 4000 DP or less from attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attack",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 2 },
    });
  });
  it("gains memory once per turn when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("blocks attacks at 4000 DP while leaving the 5000-DP boundary free", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX4-024", as: "renamon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "restricted", dp: 4000 },
            { card: "BT1-013", as: "allowed", dp: 5000 },
          ],
          security: ["BT1-090", "BT1-090"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX4-024"));

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("restricted").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("allowed").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});

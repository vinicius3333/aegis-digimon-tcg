import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-055.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-055 Lamortmon", () => {
  it("uses hand digivolution cost 3 and trashes opponent security on inherited battle deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Angoramon"] }] },
            count: 1,
          },
          into: { controllerDefault: "mine", nameOrTrait: [{ match: "name", tokens: ["Lamortmon"] }] },
          additionalCosts: [{ kind: "place", position: "bottom", host: "target", destination: "digivolutionStack" }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("trashes the opponent's top security card after a battle deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-055"] }] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {});
    await settle(() => s.state.players[1]!.security.length === 0, 3000);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

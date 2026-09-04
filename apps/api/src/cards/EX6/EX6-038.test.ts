import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-038.js";

describe("EX6-038 Ludomon", () => {
  it("pays 1 and places itself under a level 3 or Legend-Arms Digimon for +2000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      target: { fromSelectionRef: "placementTarget" },
      cost: {
        kind: "compound",
        costs: [
          { kind: "payMemory", memory: 1 },
          {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            bindHostAs: "placementTarget",
            target: { filter: { isSelfRef: true } },
          },
        ],
      },
    }));
  it("draws once per turn on stack addition and inherits +2000 DP on opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Draw", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });

  it("publicly pays 1, places Ludomon under a level-3 Digimon, and grants +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host" }],
          hand: [{ card: "EX6-038", as: "ludomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("ludomon"));
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("ludomon").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("ludomon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(5000);
  });
});

import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

  it("does not expose the hand Main effect without a legal level 3 or Legend-Arms host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-053", as: "ineligible" }], hand: [{ card: "EX6-038", as: "ludomon" }] },
    });
    await s.ready();
    expect(JSON.parse(s.inst("ludomon").activatableEffectsJson || "[]")).toHaveLength(0);
  });

  it("does not draw when an unrelated host receives a stack card, and inherits DP on opponent turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX6-038"] },
          { card: "BT1-009", as: "other" },
        ],
        hand: [{ card: "BT1-010", as: "added" }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const before = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.placeUnder(s.perm("other").permanentId, [s.inst("added").instanceId]);
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("other").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
      byEffectSeat: 0,
    });
    expect(s.state.players[0]!.deck.length).toBe(before);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });
});

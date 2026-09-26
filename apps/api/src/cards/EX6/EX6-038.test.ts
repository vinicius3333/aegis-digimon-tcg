import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-038.js";
import "./EX6-037.js";

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

    const effect = JSON.parse(s.inst("ludomon").activatableEffectsJson || "[]").find((entry: { effectKey: string }) =>
      entry.effectKey.includes("EX6-038"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("ludomon").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("ludomon").instanceId));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("ludomon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("publicly places Ludomon under a Legend-Arms host above level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-010", as: "host" }],
          hand: [{ card: "EX6-038", as: "ludomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const effect = JSON.parse(s.inst("ludomon").activatableEffectsJson || "[]").find((entry: { effectKey: string }) =>
      entry.effectKey.includes("EX6-038"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("ludomon").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("ludomon").instanceId));

    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("host").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("ludomon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(14000);
  });

  it("draws when a card is added under Ludomon during its owner's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-038", as: "host" }],
          hand: [{ card: "EX6-037", as: "spada" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    const [effect] = JSON.parse(s.inst("spada").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("spada").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("spada").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
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
    expect(s.state.players[0]!.deck.length).toBe(before);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });
});

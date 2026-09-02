import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-041.js";

describe("BT11-041 Etemon", () => {
  it("maps the catalog, alternate Sukamon evolution, and this-stack trash cost", () => {
    expect(getCardDefinition("BT11-041")).toMatchObject({
      cardId: "BT11-041",
      nameEn: "Etemon",
      colors: ["Yellow", "Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      types: ["Puppet"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }]);
    const cost = compiled.effects[0]!.actions[0]!;
    if (cost.kind !== "ModifyDP") throw new Error("BT11-041 effect is not ModifyDP");
    expect(cost.cost).toMatchObject({
      kind: "trash",
      target: { filter: { controller: "mine", hostFilter: { isSelfRef: true } } },
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              cost: { kind: "deleteOwn", target: { filter: { controller: "any", excludeSelf: true } } },
            },
          ],
        },
      ],
    });
    expect(compiledEffects["BT11-041"]).toEqual(compiled);
  });

  it("trashes a Sukamon from hand to give -3000 DP and Security Attack -1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-041", as: "etemon" },
            { card: "BT11-040", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "ST15-11", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("etemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("uses the printed alternate Sukamon evolution and can trash that evolution card for its effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-040", as: "base" }],
          hand: [{ card: "BT11-041", as: "etemon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "ST15-11", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("etemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "BT11-041" &&
        s.perm("target").currentDP === 5000 &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === baseInstanceId),
    );

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(baseInstanceId);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it.each([
    ["a friendly Sukamon", 0],
    ["an opponent's Sukamon (Q2075)", 1],
  ])("can delete %s to prevent its host's deletion", async (_label, costSeat) => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-042", as: "host", under: ["BT11-041"] },
            ...(costSeat === 0 ? ([{ card: "BT11-040", as: "cost" }] as const) : []),
          ],
        },
        1: { battleArea: costSeat === 1 ? [{ card: "BT11-040", as: "cost" }] : [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("cost").instanceId);
    const costPermanentId = s.perm("cost").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);
    expect(s.state.players[costSeat]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(costPermanentId);
  });

  it("Q2076: does not recursively reactivate a would-be-deleted prevention during its own resolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-043", as: "a", under: ["BT11-041"] },
            { card: "BT11-043", as: "b", under: ["BT11-041"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    const aId = s.perm("a").permanentId;
    const bId = s.perm("b").permanentId;
    preferInstanceIds.push(s.inst("b").instanceId, s.inst("a").instanceId);

    await advance(s.engine).verb.deletePermanent([aId], "byEffect");

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === aId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === bId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-029.js";
import "../EX13/EX13-069.js";
import "../BT11/BT11-032.js";

it("GitHub #5289: UlforceVeedramon X cannot digivolve onto another UlforceVeedramon X", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT12-029", as: "base" }],
        hand: [{ card: "BT12-029", as: "x" }],
        deck: ["BT1-009"],
      },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.inst("x").digivolveRoutes).toHaveLength(0);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("x").instanceId,
      useAlternateCost: true,
    }),
  ).toEqual({ ok: false, reason: "invalid-evolution" });
  expect(s.perm("base").topCard.instanceId).toBe(s.inst("base").instanceId);
  expect(s.state.memory).toBe(10);
});

it.each([false, true])(
  "GitHub #5289: EX13 Rina only offers a second X onto an exact Ulforce base (available %s)",
  async (otherBase) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-032", as: "base", suspended: true },
            { card: "EX13-069", as: "rina" },
            ...(otherBase ? [{ card: "BT11-032", as: "other" }] : []),
          ],
          hand: [
            { card: "BT12-029", as: "first" },
            { card: "BT12-029", as: "second" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("first").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("first").instanceId);
    expect(s.perm("rina").isSuspended).toBe(!otherBase);
    expect(s.events.filter((e) => e.kind === "digivolved")).toHaveLength(otherBase ? 2 : 1);
    const evolvedOther = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.permanentId !== s.perm("base").permanentId && permanent.topCard.cardId === "BT12-029",
    );
    expect(evolvedOther?.topCard.instanceId).toBe(otherBase ? s.inst("second").instanceId : undefined);
    expect(s.perm("base").stack.map((c) => c.cardId)).toEqual(["BT11-032"]);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("second").instanceId)).toBe(!otherBase);
  },
);

describe("BT12-029 UlforceVeedramon (X Antibody)", () => {
  it("digivolves from UlforceVeedramon for 1 and unsuspends itself", async () => {
    expect(digivolutionRequirementsFor("BT12-029")).toContainEqual({
      namesExact: ["UlforceVeedramon"],
      cost: 1,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-032", as: "ulforce", suspended: true }],
        hand: [{ card: "BT12-029", as: "x" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ulforce").permanentId,
        instanceId: s.inst("x").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ulforce").topCard.cardId === "BT12-029");
    expect(s.state.memory).toBe(9);
    expect(s.perm("ulforce").isSuspended).toBe(false);
    expect(s.perm("ulforce").stack.map(({ cardId }) => cardId)).toContain("BT11-032");
  });

  it("may unsuspend one owned blue Tamer instead of itself when digivolving", async () => {
    const options = { autoSelectCards: true, preferInstanceIds: [] as string[] };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-029", as: "x" },
            { card: "BT12-090", as: "davis", suspended: true },
          ],
        },
      },
      options,
    );
    options.preferInstanceIds.push(s.perm("davis").permanentId);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("x"));
    expect(s.perm("davis").isSuspended).toBe(false);
  });

  it("returns one opposing Digimon with the lowest level when it unsuspends and a blue Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-029", as: "x", suspended: true },
            { card: "BT12-090", as: "davis" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT12-025", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.unsuspend([s.perm("x").permanentId]);
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand[0]!.instanceId).toBe(s.inst("lowest").instanceId);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("higher").permanentId);
  });

  it("also qualifies from an UlforceVeedramon evolution card and resolves only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-029", as: "x", under: ["BT11-032"], suspended: true }] },
        1: { battleArea: [{ card: "BT1-009" }, { card: "BT1-010" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.unsuspend([s.perm("x").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("x").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("x").permanentId]);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not return anything without a blue Tamer or UlforceVeedramon source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-029", as: "x", suspended: true }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    await advance(s.engine).verb.unsuspend([s.perm("x").permanentId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-028.js";

describe("EX4-028 Doumon", () => {
  it("is also treated as Taomon by rule", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Taomon"],
    });
  });

  it("returns an opposing Digimon at 6000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Return",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      target: { filter: { dp: { op: "lte", value: 6000 } } },
    });
  });
  it("reduces one opposing Digimon by 2000 after a sufficiently costly Option", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "ModifyDP", amount: -2000 }],
        },
      ],
    });
  });

  it("requires the exact Kyubimon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Kyubimon"], cost: 3 }]);
  });

  it("returns the exact 6000-DP boundary while a 7000-DP opponent remains", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX4-028", as: "doumon" }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "boundary", dp: 6000 },
            { card: "BT1-021", as: "above", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").topCard.instanceId;
    const aboveId = s.perm("above").permanentId;
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("doumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === boundaryId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === aboveId)).toBe(true);
    expect(observe(s.engine).grantedNames(s.perm("doumon"))).toContain("taomon");
  });

  it("returns the exact boundary during a real digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-034", as: "kyubimon" }],
          hand: [{ card: "EX4-028", as: "doumon" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyubimon").permanentId,
        instanceId: s.inst("doumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-019"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("digivolves from the exact Kyubimon alternate requirement for three memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-034", as: "kyubimon" }],
        hand: [{ card: "EX4-028", as: "doumon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyubimon").permanentId,
        instanceId: s.inst("doumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kyubimon").topCard.cardId === "EX4-028");
    expect(s.perm("kyubimon").topCard.cardId).toBe("EX4-028");
    expect(s.state.memory).toBe(0);
  });

  it("requires an Option cost of at least two and activates only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-028"] },
            { card: "BT1-045", as: "yellow" },
            { card: "BT1-064", as: "green" },
          ],
          hand: [
            { card: "BT1-108", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option1").instanceId));
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7);
    expect(s.perm("target").currentDP).toBe(4000);
  });
});

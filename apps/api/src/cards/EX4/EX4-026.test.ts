import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-026.js";

describe("EX4-026 Youkomon", () => {
  it("grants Blocker on play and digivolution and is also treated as Kyubimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Kyubimon"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
      });
  });

  it("reduces an opposing Digimon by 2000 when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "ModifyDP", amount: -2000 }],
        },
      ],
    });
  });

  it("requires the exact Renamon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["Renamon"], cost: 2 }]);
  });

  it("grants Blocker to the selected Digimon on the live board", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ally" }],
          hand: [{ card: "EX4-026", as: "youkomon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("youkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(observe(s.engine).grantedNames(s.perm("youkomon"))).toContain("kyubimon");
  });

  it("applies the inherited Option-cost boundary once through two public Option uses", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "host", under: ["EX4-026"] },
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

  it("grants Blocker through the public digivolution path", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "EX4-026", as: "youkomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("renamon").permanentId,
        instanceId: s.inst("youkomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  });
});

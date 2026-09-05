import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-034.js";
import "../index.js";

describe("EX5-034 BanchoLeomon", () => {
  it("reduces play cost by five when combined security is six or fewer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")?.actions?.[0]).toMatchObject({
      kind: "ReducePlayCost",
      payment: {
        kind: "automatic",
        condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
      },
      amount: { kind: "fixed", value: 5 },
    });
  });
  it("suspends on play/digivolving and applies the bound -4000/Security Attack -1 package", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent" } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { kind: ["Digimon"] },
          actions: [
            { kind: "SelectBind", optional: true, target: { bindAs: "ex5034OptionalTarget" } },
            { kind: "ModifyDP", amount: -4000, target: { fromSelectionRef: "ex5034OptionalTarget" } },
            {
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: -1 },
              target: { fromSelectionRef: "ex5034OptionalTarget" },
            },
          ],
        },
      ],
    });
  });

  it("plays for seven memory at six combined security and suspends an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-034", as: "bancho" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 9000 }], security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bancho").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("does not receive the play-cost reduction above six combined security cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-034", as: "bancho" }], security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
        1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bancho").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-034"));
    expect(s.state.memory).toBe(-5);
  });

  it("suspends an opponent and applies the same package on public digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-032", as: "base" }], hand: [{ card: "EX5-034", as: "bancho" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});

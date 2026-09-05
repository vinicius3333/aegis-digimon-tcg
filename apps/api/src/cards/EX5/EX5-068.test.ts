import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-068.js";
import "../index.js";

describe("EX5-068 Flashy Boss Punch", () => {
  it("waives color requirements with Leomon/Bancho present and suspends then weakens an opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "name", tokens: ["Leomon", "Bancho"] }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      {
        kind: "ModifyDP",
        amount: -12000,
        duration: "forTheTurn",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      },
      {
        kind: "Attack",
        optional: true,
        target: {
          count: 1,
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Leomon", "Bancho"] }],
          },
        },
        withoutSuspending: false,
      },
    ]);
  });
  it("has the same suspend and DP reduction in security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      {
        kind: "ModifyDP",
        amount: -12000,
        duration: "forTheTurn",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      },
    ]));

  it("suspends and reduces one opposing Digimon through public Main use", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-047", as: "leomon" }], hand: [{ card: "EX5-068", as: "option" }] },
        1: { battleArea: [{ card: "BT1-020", dp: 15000, as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").isSuspended);
    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.perm("victim").currentDP).toBe(3000);
    expect(s.state.memory).toBe(0);
  });

  it("accepts the optional Main attack with a matching Leomon through public runtime", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-047", as: "leomon" }], hand: [{ card: "EX5-068", as: "option" }] },
        1: {
          battleArea: [{ card: "BT1-020", dp: 15000, as: "victim" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("leomon").isSuspended);
    expect(s.perm("leomon").isSuspended).toBe(true);
    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("does not use the Main effect without a matching color or Leomon/Bancho Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "unrelated" }], hand: [{ card: "EX5-068", as: "option" }] },
      1: { battleArea: [{ card: "BT1-020", as: "victim" }] },
    });
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-068")).toBe(true);
  });

  it("applies the suspend and DP reduction from the Security timing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-047", as: "leomon" }], security: [{ card: "EX5-068", as: "option" }] },
      1: { battleArea: [{ card: "BT1-020", dp: 15000, as: "victim" }] },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.perm("victim").isSuspended);
    expect(s.perm("victim").isSuspended).toBe(true);
    expect(s.perm("victim").currentDP).toBe(3000);
  });
});

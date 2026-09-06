import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-077.js";
import "../index.js";
describe("BT21-077 Regulusmon", () => {
  it("costs a Gammamon card to grant Collision and recurs on deletion", () => {
    const action = compiled.effects.find((e) => e.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Collision" },
      cost: {
        kind: "trash",
        target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] } },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects.find((e) => e.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "GainTriggeredEffect",
      target: { sameTarget: true },
      gainedTrigger: "StartOfYourMainPhase",
    });
    expect(compiled.effects.filter((e) => e.trigger === "OnDeletion")).toHaveLength(2);
    expect(compiled.effects.find((e) => e.trigger === "OnDeletion" && !e.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          orFilters: expect.arrayContaining([{ nameOrTrait: [{ tokens: ["Canoweissmon"], match: "nameExact" }] }]),
        },
      },
    });
    expect(compiled.effects.find((e) => e.trigger === "OnDeletion" && e.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Gammamon"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes a Gammamon-text card and grants both effects to the same opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-077", as: "regulusmon" }],
          hand: [{ card: "BT21-010", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("cost").instanceId, s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("regulusmon"));
    await settle(() => observe(s.engine).customEffectGrants(s.perm("target")).length === 1);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(true);
    expect(observe(s.engine).customEffectGrants(s.perm("other"))).toHaveLength(0);
  });

  it("resolves the printed grant through a public play intent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-077", as: "regulusmon" },
            { card: "BT21-010", as: "gammamon-cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("gammamon-cost").instanceId, s.perm("target").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("target")).length === 1);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("gammamon-cost").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(true);
    expect(observe(s.engine).customEffectGrants(s.perm("other"))).toHaveLength(0);
  });

  it.each([
    ["declined", "BT21-010", true],
    ["nonmatching", "BT1-009", false],
  ] as const)("does not pay or grant when the cost is %s", async (_label, costCard, decline) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-077", as: "regulusmon" }], hand: [{ card: costCard, as: "cost" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      decline
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("regulusmon"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(false);
  });

  it.each([
    ["Canoweissmon", "BT21-078"],
    ["level-4 Gammamon-text", "BT21-069"],
  ])("main deletion plays %s from trash", async (_label, card) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-077", as: "regulusmon" }], trash: [{ card, as: "played" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("regulusmon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );
  });

  it("inherited deletion plays level-4 Gammamon text but not Canoweissmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-078", as: "host", under: [{ card: "BT21-077", as: "source" }] }],
          trash: [
            { card: "BT21-069", as: "gulus" },
            { card: "BT21-078", as: "canoweissmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("gulus").instanceId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("gulus").instanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("canoweissmon").instanceId)).toBe(true);
  });

  it("uses the level-4 Gammamon-text alternate evolution route for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-069", as: "gulus" }],
        hand: [{ card: "BT21-077", as: "regulusmon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gulus").permanentId,
        instanceId: s.inst("regulusmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gulus").topCard.instanceId === s.inst("regulusmon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});

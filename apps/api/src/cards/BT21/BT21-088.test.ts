import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-088.js";

describe("BT21-088 Tagiru Akashi", () => {
  it("draws after the Save/Hero hand placement and pays the digivolution reduction with both costs", () => {
    const start = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(start?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "place" },
    });
    expect(start?.actions[0]).toMatchObject({
      cost: {
        target: {
          filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
          orFilters: [{ nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] }],
        },
        underFilter: { isSelfRef: true },
      },
    });
    expect(start?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { kind: ["Digimon"] },
      into: {
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Save"], match: "text" }],
        orFilters: [{ nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] }],
      },
    });
    const reduction = (yourTurn?.actions[0] as { actions?: unknown[] } | undefined)?.actions?.[0];
    expect(reduction).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 1,
      cost: { kind: "suspend" },
      additionalCosts: [
        {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "target",
          underFilter: { isTriggerSource: true },
        },
      ],
    });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places a Save Digimon under itself and gains memory at start of main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT21-088", as: "tagiru" }], hand: [{ card: "BT21-063", as: "saveDigimon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tagiru"));
    await settle(() => s.perm("tagiru").stack.some((card) => card.cardId === "BT21-063"));

    expect(s.perm("tagiru").stack.map((card) => card.cardId)).toContain("BT21-063");
    expect(s.state.memory).toBe(4);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
  });

  it("Q4603 places the hand cost at the bottom under this Tamer, then draws and gains memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-088", as: "tagiru", under: [{ card: "BT1-009", as: "existing" }] },
            { card: "BT1-085", as: "otherTamer" },
          ],
          hand: [{ card: "BT21-063", as: "saveDigimon" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("otherTamer").permanentId);
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tagiru"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tagiru").stack.map((card) => card.instanceId)).toEqual([
      s.inst("saveDigimon").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.perm("otherTamer").stack).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("declining the start-of-main cost does not place, draw, or gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-088", as: "tagiru" }],
          hand: [{ card: "BT21-063", as: "saveDigimon" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tagiru"));
    expect(s.perm("tagiru").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("saveDigimon").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("reduces a Save/Hero digivolution by 1 and moves an under-Tamer card to the true bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-088", as: "tagiru", under: [{ card: "BT1-009", as: "placedCost" }] },
            { card: "BT21-063", as: "host", under: [{ card: "BT1-010", as: "existing" }] },
          ],
          hand: [{ card: "BT21-066", as: "arrester" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("arrester").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("arrester").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tagiru").isSuspended).toBe(true);
    expect(s.perm("tagiru").stack).toHaveLength(0);
    expect(s.perm("host").stack[0]?.instanceId).toBe(s.inst("placedCost").instanceId);
    expect(s.perm("host").stack[1]?.instanceId).toBe(s.inst("existing").instanceId);
  });

  it("plays itself from Security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-088", as: "tagiru" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tagiru"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});

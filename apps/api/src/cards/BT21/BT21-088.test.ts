import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-088.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

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
        nameOrTrait: [
          { tokens: ["Save"], match: "text" },
          { tokens: ["Hero"], match: "trait" },
        ],
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

  it.each([
    ["Save text", "BT10-008", true],
    ["Hero Digimon", "BT21-064", true],
    ["nonmatching Digimon", "BT1-009", false],
    ["Hero Tamer", "BT21-080", false],
    ["Hero Digi-Egg", "BT21-001", false],
  ] as const)(
    "public Start Main checks %s and places only the eligible hand Digimon at its bottom",
    async (_label, candidate, eligible) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-088", as: "tagiru", under: [{ card: "BT1-009", as: "existing" }] },
              { card: "BT1-085", as: "otherTamer" },
            ],
            hand: [{ card: candidate, as: "candidate" }],
            deck: [
              { card: "BT1-010", as: "effectDraw" },
              { card: "BT1-001", as: "reserve" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      if (eligible) await settle(() => s.state.memory === 4);
      expect(s.state.memory).toBe(eligible ? 4 : 3);
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
      expect(s.perm("tagiru").stack.map((card) => card.instanceId)).toEqual(
        eligible ? [s.inst("candidate").instanceId, s.inst("existing").instanceId] : [s.inst("existing").instanceId],
      );
      expect(s.perm("otherTamer").stack).toHaveLength(0);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDraw").instanceId)).toBe(
        eligible,
      );
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(
        !eligible,
      );
      // Seat 0 skips its ordinary draw on the first turn; only Tagiru draws here.
      expect(s.state.players[0]!.deck).toHaveLength(eligible ? 1 : 2);
    },
  );

  it("declining the start-of-main cost does not place, draw, or gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-088", as: "tagiru" }],
          hand: [{ card: "BT21-063", as: "saveDigimon" }],
          deck: ["BT1-001", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    expect(s.perm("tagiru").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("saveDigimon").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("reduces a Save/Hero digivolution by 1 and moves an under-Tamer card to the true bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-088", as: "tagiru", under: [{ card: "BT1-009", as: "placedCost" }] },
            { card: "BT21-063", as: "host", under: [{ card: "BT12-005", as: "existing" }] },
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

  it("plays itself from a public Security attack without paying cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT21-088", as: "tagiru" }] },
      1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tagiru").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(3);
  });
  it.each([
    ["declined", true, true, false],
    ["no under-Tamer card", false, false, false],
    ["already suspended", false, true, true],
  ] as const)("does not reduce or move material when the cost is %s", async (_label, decline, material, suspended) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-088", as: "tagiru", suspended, under: material ? [{ card: "BT1-009", as: "material" }] : [] },
            { card: "BT21-063", as: "host" },
          ],
          hand: [{ card: "BT21-066", as: "evolution" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-066");
    expect(s.state.memory).toBe(1);
    expect(s.perm("tagiru").isSuspended).toBe(suspended);
    expect(s.perm("tagiru").stack).toHaveLength(material ? 1 : 0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-063"]);
  });

  it.each([
    ["Save-only", "BT12-076", "BT21-063", 1, true],
    ["Hero-only", "BT21-013", "BT1-010", 1, true],
    ["neither", "ST6-08", "BT21-063", 1, false],
  ] as const)(
    "compares the %s evolution while paying from another own Tamer",
    async (_label, evolution, source, expectedCost, reduces) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-088", as: "tagiru" },
              { card: "BT1-085", as: "otherTamer", under: [{ card: "BT1-009", as: "material" }] },
              { card: source, as: "host" },
            ],
            hand: [{ card: evolution, as: "evolution" }],
            deck: ["BT1-001", "BT1-002", "BT1-003"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard.cardId === evolution);
      expect(s.state.memory).toBe(5 - expectedCost);
      expect(s.perm("tagiru").isSuspended).toBe(reduces);
      expect(s.perm("otherTamer").stack).toHaveLength(reduces ? 0 : 1);
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(reduces ? ["BT1-009", source] : [source]);
    },
  );
});

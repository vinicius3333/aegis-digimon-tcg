import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-010.js";
import "./BT18-011.js";

describe("BT18-010 [Your Turn][Once Per Turn] digivolve into [Hybrid] → gain 1 memory", () => {
  it("has complete declarative coverage for both printed clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }] },
      {
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOneOfYoursDigivolves",
            sourceFilter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }],
            },
            actions: [{ kind: "GainMemory", amount: 1 }],
          },
        ],
      },
    ]);
  });

  it("gains 1 memory when a Hybrid-trait Digimon digivolves while BT18-010 is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-010", dp: 3000, as: "bokomon" },
            { card: "BT1-009", as: "base1" },
            { card: "BT1-009", as: "base2" },
          ],
          hand: [
            { card: "BT18-011", as: "agunimon1" },
            { card: "BT18-011", as: "agunimon2" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const { engine, state } = s;

    await engine.recomputeContinuousEffects();

    state.memory = 10;
    expect(
      engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base1").permanentId,
        instanceId: s.inst("agunimon1").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base1").topCard.cardId === "BT18-011" && state.memory === 8);

    expect(
      engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base2").permanentId,
        instanceId: s.inst("agunimon2").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base2").topCard.cardId === "BT18-011" && state.memory === 5);
    expect(state.memory).toBe(5);
  });

  it("does NOT gain memory when a non-Hybrid Digimon digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-010", dp: 3000, as: "bokomon" },
            { card: "BT1-009", as: "base" },
          ],
          hand: [{ card: "BT1-016", as: "nonHybrid" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const { engine, state } = s;
    await engine.recomputeContinuousEffects();

    state.memory = 10;
    expect(
      engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("nonHybrid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-016" && state.memory === 8);

    expect(state.memory).toBe(8);
  });

  it("reveals three and mandatorily adds both printed categories", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-010", as: "bokomon" }],
          deck: [{ card: "BT12-009" }, { card: "BT18-088" }, { card: "BT1-010" }, { card: "BT1-011" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT12-009") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT18-088"),
    );
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("gains memory when a Tamer digivolves into a Hybrid", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-010", as: "bokomon" },
          { card: "BT12-088", as: "takuya" },
        ],
        hand: [{ card: "BT18-011", as: "agunimon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("agunimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT18-011" && s.state.memory === 9);
    expect(s.state.memory).toBe(9);
  });

  it("digivolves from a red level 2 for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "egg" }],
        hand: [{ card: "BT18-010", as: "bokomon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("bokomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT18-010");
    expect(s.state.memory).toBe(2);
  });
});

describe("BT18-010 Bokomon — KB Q&A rulings", () => {
  it("must add every revealed card that matches each category to the hand (Q2912)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT18-010", as: "bokomon" }],
        deck: [{ card: "BT18-011", as: "hybrid" }, { card: "BT18-088", as: "tamer" }, "BT1-009", "BT1-009"],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bokomon").instanceId })).toEqual({
      ok: true,
    });

    const hybridIds = [s.inst("hybrid").instanceId];
    const tamerIds = [s.inst("tamer").instanceId];
    for (const expected of [hybridIds, tamerIds]) {
      await settle(() => s.decisions.at(-1)?.req.options?.candidateInstanceIds?.[0] === expected[0]);
      const decision = s.decisions.at(-1)!;
      expect(decision.req.kind).toBe("selectCards");
      expect(decision.req.options).toMatchObject({ candidateInstanceIds: expected, min: 1, max: 1 });
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }).ok,
      ).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response: { kind: "selectCards", instanceIds: expected },
        }),
      ).toEqual({ ok: true });
    }

    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT18-011", "BT18-088"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});

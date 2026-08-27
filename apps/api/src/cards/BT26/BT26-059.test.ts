import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-059.js";
import "../index.js";

describe("BT26-059 Plutomon", () => {
  it("encodes hand-size cost reduction, shared three-window trash/play, and all-hand-trash lowest-level deletion", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({ level: 5, traits: ["TS"], cost: 4, isAlternate: true });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 6 }],
    });
    expect(compiled.effects?.slice(1, 4).map((e) => e.sharedUseKey)).toEqual([
      "bt26-059-trash-play-titan",
      "bt26-059-trash-play-titan",
      "bt26-059-trash-play-titan",
    ]);
    expect(compiled.effects?.[1]?.actions).toEqual([
      expect.objectContaining({
        kind: "CostGatedBlock",
        cost: expect.objectContaining({ kind: "trash" }),
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            target: expect.objectContaining({ filter: expect.objectContaining({ excludeNames: ["Plutomon"] }) }),
            condition: expect.objectContaining({ kind: "isYourTurn" }),
          }),
        ],
      }),
    ]);
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          fireCondition: { kind: "triggerHandTrashedSeat", seat: "any" },
          actions: [{ kind: "Delete", target: { count: "all" } }],
        },
      ],
    });
  });

  it("publicly trashes a hand card, plays a Titan from trash, and deletes the opponent's lowest-level Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("fires the same trash-and-play body when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("plutomon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("selects only Titan trait Digimon from a mixed trash pool and excludes Plutomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [
            { card: "BT26-021", as: "validTitan" },
            { card: "BT26-059", as: "excludedPlutomon" },
            { card: "BT26-060", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-059", "BT26-060"]),
    );
  });

  it("reduces its play cost by 6 only when its hand is strictly smaller at announcement", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT26-059", as: "plutomon" }] },
      1: { hand: ["BT1-001", "BT1-002"] },
    });
    reduced.state.memory = 7;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("plutomon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-059"),
    );
    expect(reduced.state.memory).toBe(0);

    const tied = setupEngine({
      0: { hand: [{ card: "BT26-059", as: "plutomon" }] },
      1: { hand: ["BT1-001"] },
    });
    tied.state.memory = 7;
    await tied.ready();
    expect(tied.engine.applyIntent(0, { type: "playCard", instanceId: tied.inst("plutomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => tied.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-059"));
    expect(tied.state.memory).toBe(-6);
  });

  it("uses the alternate TS evolution requirement from a level-5 TS Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-071", as: "tsBase" }],
        hand: [{ card: "BT26-059", as: "plutomon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("plutomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === "BT26-059");

    expect(s.perm("tsBase").topCard.cardId).toBe("BT26-059");
    expect(s.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT26-055", as: "nonTsBase" }],
        hand: [{ card: "BT26-059", as: "plutomon" }],
      },
    });
    invalid.state.memory = 4;
    await invalid.ready();

    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonTsBase").permanentId,
        instanceId: invalid.inst("plutomon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("may pay the hand-trash activation outside its turn, triggering deletion without playing a Titan", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT26-021"]),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT26-021");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("may decline the optional hand-trash activation without paying or playing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("titan").instanceId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT26-021");
  });

  it("Q7077: stacks its -7 reduction with GranKuwagamon's -4 play reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: [{ card: "BT26-045", as: "granKuwagamon" }],
        },
        1: { hand: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("granKuwagamon").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-045");
    expect(s.state.memory).toBe(0);
  });

  it("Q7078: reacts when the opponent's hand is trashed and deletes every tied lowest-level Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-059", as: "plutomon" }] },
        1: {
          hand: [{ card: "BT1-001", as: "opponentHand" }],
          battleArea: [
            { card: "BT1-009", as: "lowestOne" },
            { card: "BT1-010", as: "lowestTwo" },
            { card: "BT1-082", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const higherId = s.perm("higher").permanentId;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("opponentHand").instanceId], 0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([higherId]);
  });

  it("shares Once Per Turn across On Play and When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-059", as: "plutomon" }],
          hand: [
            { card: "BT1-001", as: "firstCost" },
            { card: "BT1-002", as: "secondCost" },
          ],
          trash: [
            { card: "BT26-021", as: "firstTitan" },
            { card: "BT26-022", as: "secondTitan" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("plutomon"));
    const handAfterFirst = s.state.players[0]!.hand.length;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("plutomon"));

    expect(handAfterFirst).toBe(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => ["BT26-021", "BT26-022"].includes(topCard.cardId)),
    ).toHaveLength(1);
  });
});

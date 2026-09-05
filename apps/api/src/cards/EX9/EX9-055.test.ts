import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-055.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-055", () => {
  it.each(["EX9-005", "EX9-057", "BT1-010", "EX9-047"])(
    "does not place an ineligible or explicitly declined end-turn cost: %s",
    async (card) => {
      const decline = card === "EX9-047";
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX9-055", as: "source", under: ["EX9-054"] }], trash: [card] },
          1: { battleArea: [{ card: "BT10-062", as: "target" }] },
        },
        { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
      );
      const memory = s.state.memory;
      await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
      await settle();
      expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-054"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([card]);
      expect(s.perm("target").topCard.cardId).toBe("BT10-062");
      expect(s.state.players[1]!.trash).toHaveLength(0);
      expect(s.state.memory).toBe(memory);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each(["three", "text-only", "opponent", "occupied"] as const)(
    "does not play Core when its condition fails: %s",
    async (scenario) => {
      const eggs =
        scenario === "occupied" ? ["EX9-005", "EX9-005", "EX9-005", "EX9-005"] : ["EX9-005", "EX9-005", "EX9-005"];
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "EX9-055", as: "source" }, "EX9-057"],
            trash: [...eggs, ...(scenario === "text-only" ? ["EX9-047"] : [])],
            ...(scenario === "occupied" ? { breeding: { card: "BT1-001", as: "egg" } } : {}),
          },
          1: { trash: scenario === "opponent" ? ["EX9-005"] : [] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      const initialBreeding = s.state.players[0]!.breeding?.topCard.instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(initialBreeding);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-057"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([
        ...eggs,
        ...(scenario === "text-only" ? ["EX9-047"] : []),
      ]);
      expect(s.state.memory).toBe(-1);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("plays Abbadomon Core from hand or trash in breeding when four exact Negamon cards are available", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          breeding: true,
          requiresEmpty: "breedingArea",
          condition: { kind: "youHave", count: 4 },
        },
      ],
    }));
  it("at end of all turns places a level 6-or-lower Negamon-text Digimon from trash and deletes a matching opposing level", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { filter: { levelComparison: { op: "eq", value: 0, scaling: { unit: "namedCount" } } } },
          cost: { kind: "place", position: "top", target: { filter: { levelComparison: { op: "lte", value: 6 } } } },
        },
      ],
    }));
  it("requires four Negamon cards across trash and digivolution cards for either play trigger", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        optional: true,
        from: ["hand", "trash"],
        breeding: true,
        requiresEmpty: "breedingArea",
        condition: {
          kind: "youHave",
          count: 4,
          filter: {
            zone: ["trash", "digivolutionCards"],
            kind: ["Digimon", "DigiEgg"],
            nameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
          },
        },
      });
  });
  it("excludes Digi-Eggs from the deletion cost and stores the placed level for matching deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAllTurns")?.actions[0]).toMatchObject({
      optional: true,
      abortOnDecline: true,
      cost: {
        target: {
          from: ["trash"],
          filter: {
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
          },
          count: 1,
        },
        destination: "digivolutionStack",
        position: "top",
        host: "self",
        storeAs: "ex9055PlacedLevel",
      },
    }));
  it.each([
    [0, "EX9-047", "BT10-062"],
    [1, "EX9-047", "BT10-062"],
    [0, "EX9-055", "BT2-064"],
    [1, "EX9-055", "BT2-064"],
  ] as const)("places %s-turn payment %s on top and deletes the matching level %s", async (seat, payment, target) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-055", as: "source", under: ["EX9-054"] }],
          trash: [payment],
          deck: ["BT1-010", "BT1-048"],
        },
        1: {
          battleArea: [
            { card: target, as: "target" },
            { card: "BT10-064", as: "peer" },
          ],
          deck: ["BT1-010", "BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = seat;
    s.state.memory = 5;
    await advance(s.engine).runTurn(seat);
    await settle();
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-054", payment]);
    expect(s.perm("source").stack.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT10-064"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual([target]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not place or delete again when another matching payment and target remain in the same turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-055", as: "source" }], trash: ["EX9-047", "EX9-048"] },
        1: {
          battleArea: [
            { card: "BT10-062", as: "first" },
            { card: "BT10-062", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-047"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-048"]);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("second").permanentId]);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-047"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-048"]);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("second").permanentId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["hand", "trash"] as const)("plays Abbadomon Core from %s after real On Play", async (zone) => {
    const s = setupEngine(
      {
        0: {
          trash: ["EX9-005", "EX9-005", "EX9-005", "EX9-005", ...(zone === "trash" ? ["EX9-057"] : [])],
          hand: [{ card: "EX9-055", as: "source" }, ...(zone === "hand" ? ["EX9-057"] : [])],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("EX9-057");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.breeding?.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-005", "EX9-005", "EX9-005", "EX9-005"]);
    expect(s.state.memory).toBe(-1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["hand", "trash"] as const)(
    "Q4810 counts two trash and two source Negamon after real evolution, Core from %s",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-054", as: "source" },
              // Negamon's breeding Main effect can play Eyesmon directly and place itself underneath.
              // These are effect-created stacks, not level-2-to-4 digivolutions.
              { card: "EX9-047", as: "peer1", under: ["EX9-005"] },
              { card: "EX9-047", as: "peer2", under: ["EX9-005"] },
            ],
            trash: ["EX9-005", "EX9-005", ...(zone === "trash" ? ["EX9-057"] : [])],
            hand: [{ card: "EX9-055", as: "evo" }, ...(zone === "hand" ? ["EX9-057"] : [])],
            deck: ["BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );

      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();

      expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("EX9-057");
      expect(s.state.players[0]!.breeding?.stack).toHaveLength(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-005", "EX9-005"]);
      expect(s.perm("source").topCard.cardId).toBe("EX9-055");
      expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-054"]);
      expect(s.perm("peer1").stack.map(({ cardId }) => cardId)).toEqual(["EX9-005"]);
      expect(s.perm("peer2").stack.map(({ cardId }) => cardId)).toEqual(["EX9-005"]);
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("leaves Abbadomon Core in hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-055", as: "source" }],
          trash: ["EX9-005", "EX9-005", "EX9-005", "EX9-005"],
          hand: ["EX9-057"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-057")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves Abbadomon Core in hand when the optional digivolution play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-055", as: "source" }],
          trash: ["EX9-005", "EX9-005", "EX9-005", "EX9-005"],
          hand: ["EX9-057"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-057")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

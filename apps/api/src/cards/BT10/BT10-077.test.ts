import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../EX2/EX2-042.js";
import "../EX7/EX7-013.js";
import "../BT13/BT13-026.js";
import "../LM/LM-002.js";
import "./BT10-077.js";
import "./BT10-084.js";

describe("BT10-077 MadLeomon", () => {
  it("only trashes its own source when an effect adds cards to the opponent's hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-077", as: "madleomon" }] },
        1: {
          battleArea: [{ card: "BT10-081", as: "opponentHost", under: [{ card: "BT10-071", as: "opponentSource" }] }],
          hand: [{ card: "BT1-010", as: "kept" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: 1,
      addedToHand: { instanceIds: [s.inst("kept").instanceId] },
    });

    expect(
      s.state.players[1]!.battleArea[0]!.stack.some((card) => card.instanceId === s.inst("opponentSource").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("trashes a source so the opponent discards the number of cards an effect added", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-077", as: "madleomon", under: [{ card: "BT10-071", as: "cost" }] }] },
        1: { hand: ["BT1-010", { card: "BT1-001", as: "added1" }, { card: "BT1-002", as: "added2" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: 1,
      addedToHand: { instanceIds: [s.inst("added1").instanceId, s.inst("added2").instanceId] },
    });
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it("counts separate add-to-hand effects separately and resolves only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-077",
              as: "madleomon",
              under: [
                { card: "BT10-071", as: "cost1" },
                { card: "BT10-073", as: "cost2" },
              ],
            },
          ],
        },
        1: {
          hand: [
            { card: "BT1-010", as: "kept1" },
            { card: "BT1-011", as: "kept2" },
            { card: "BT1-012", as: "firstAdded" },
            { card: "BT1-015", as: "secondAdded1" },
            { card: "BT1-016", as: "secondAdded2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: 1,
      addedToHand: { instanceIds: [s.inst("firstAdded").instanceId] },
    });
    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.perm("madleomon").stack).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", {
      effectAddedToHandSeat: 1,
      addedToHand: {
        instanceIds: [s.inst("secondAdded1").instanceId, s.inst("secondAdded2").instanceId],
      },
    });

    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.perm("madleomon").stack).toHaveLength(1);
  });

  it("gains owner memory when its inherited source is trashed on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-081", as: "host", under: [{ card: "BT10-077", as: "source" }] }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 1);
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(-1);
  });

  it("uses Save to place itself under a friendly Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-077", as: "madleomon" },
            { card: "BT10-093", as: "yuu" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const id = s.perm("madleomon").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("madleomon").permanentId], "byEffect");
    await settle(() => s.perm("yuu").stack.some(({ instanceId }) => instanceId === id));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === id)).toBe(false);
  });
});

describe("BT10-077 MadLeomon — KB Q&A rulings", () => {
  const instanceIdsOf = (cards: Iterable<{ instanceId: string }>): string[] =>
    Array.from(cards, (card) => card.instanceId);

  it("counts only one of two simultaneous <Draw 1> effects, so only 1 card is trashed (Q1998)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-077",
              as: "madleomon",
              under: [
                { card: "BT10-071", as: "firstCost" },
                { card: "BT10-071", as: "secondCost" },
              ],
            },
          ],
          security: ["BT10-071"],
        },
        1: {
          battleArea: [{ card: "BT13-026", as: "teslaJellymon", under: [{ card: "LM-002", as: "jellymon" }] }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("teslaJellymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 2, 5000);
    await advance(s.engine).finishAttack();
    await settle();

    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.perm("madleomon").stack).toHaveLength(1);
  });

  it("activates after a net-zero <Draw 2>, then trash 2 effect, for 4 hand cards trashed in total (Q1999)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-077", as: "madleomon", under: [{ card: "BT10-071", as: "cost" }] }],
        },
        1: {
          hand: [{ card: "EX2-042", as: "mephistomon" }, "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("mephistomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 4, 5000);
    await settle();

    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(instanceIdsOf(s.state.players[0]!.trash)).toContain(s.inst("cost").instanceId);
    const trashMoves = s.events.flatMap((event) =>
      event.kind === "cardsMoved" && event.to === "trash" ? [event.instanceIds] : [],
    );
    expect(trashMoves.map((instanceIds) => instanceIds.length)).toEqual([2, 1, 2]);
    expect(trashMoves[1]).toEqual([s.inst("cost").instanceId]);
  });

  it("activates through Tactimon's replacement when MadLeomon itself has no digivolution cards (Q2008)", async () => {
    const drawWithMephistomon = async (withTactimon: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT10-077", as: "madleomon" },
              ...(withTactimon
                ? [{ card: "BT10-084", as: "tactimon", under: [{ card: "BT10-071", as: "tactimonSource" }] }]
                : []),
            ],
          },
          1: {
            hand: [{ card: "EX2-042", as: "mephistomon" }, "BT1-010", "BT1-011"],
            deck: ["BT1-012", "BT1-015", "BT1-016"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      s.state.memory = 10;
      await s.ready();

      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("mephistomon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.trash.length >= 2, 5000);
      await settle();
      return s;
    };

    const replaced = await drawWithMephistomon(true);
    expect(replaced.perm("tactimon").stack).toHaveLength(0);
    expect(instanceIdsOf(replaced.state.players[0]!.trash)).toContain(replaced.inst("tactimonSource").instanceId);
    expect(replaced.state.players[1]!.hand).toHaveLength(0);
    expect(replaced.state.players[1]!.trash).toHaveLength(4);

    const withoutReplacement = await drawWithMephistomon(false);
    expect(withoutReplacement.state.players[1]!.hand).toHaveLength(2);
    expect(withoutReplacement.state.players[1]!.trash).toHaveLength(2);
  });

  it("makes the opponent trash 5 cards after MagnaKidmon draws 5 (Q3832)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-077", as: "madleomon", under: [{ card: "BT10-071", as: "cost" }] }],
        },
        1: {
          hand: [{ card: "EX7-013", as: "magnaKidmon" }, "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-015", "BT1-016", "BT1-017", "BT1-018", "BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("magnaKidmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 5, 5000);
    await settle();

    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(instanceIdsOf(s.state.players[0]!.trash)).toContain(s.inst("cost").instanceId);
  });
});

import { describe, expect, it } from "vitest";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT14-065.js";

describe("BT14-065", () => {
  it("reveals three opponent cards and de-digivolves an opponent by one plus one per own Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "RevealAdd", controller: "opponent", revealCount: 3, rest: "deckTopOrBottom" },
          {
            kind: "DeDigivolve",
            amount: 1,
            scaling: { unit: "cards", per: 1, filter: { zone: "revealed", kind: ["Digimon"] } },
          },
        ],
      });
  });

  it("naturally reveals the opponent deck and scales repeated de-digivolution from revealed Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-065", as: "source" }] },
        1: {
          deck: ["BT14-055", "BT14-064", "BT14-061"],
          battleArea: [{ card: "BT14-067", as: "target", under: ["BT14-055", "BT14-061", "BT14-064"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea[0]!.topCard.cardId === "BT14-055");

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT14-055");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT14-067", "BT14-064", "BT14-061"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-055", "BT14-064", "BT14-061"]);
  });

  it("naturally resolves the When Digivolving trigger from a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-065", as: "evolving" }],
          battleArea: [{ card: "BT14-061", as: "base" }],
        },
        1: {
          deck: ["BT14-055", "BT14-082", "BT14-089"],
          battleArea: [{ card: "BT14-067", as: "target", under: ["BT14-064"] }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea[0]!.topCard.cardId === "BT14-064");

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT14-065");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT14-064");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT14-067"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-055", "BT14-082", "BT14-089"]);
  });
});

const deDigivolveCountPrompts = (s: EngineSetup) =>
  s.decisions.filter(
    ({ req }) =>
      req.kind === "chooseOption" && (req.options?.choices ?? []).some((choice) => /^\d+ cards?$/.test(choice)),
  );

async function playVademonAgainstRevealedDeck(revealed: string[]) {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT14-065", as: "vademon" }] },
      1: {
        deck: revealed,
        battleArea: [{ card: "BT14-067", as: "target", under: ["BT14-055", "BT14-061", "BT3-085", "BT14-064"] }],
      },
    },
    { autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vademon").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[1]!.trash.length >= 2 &&
      s.state.players[1]!.deck.length === revealed.length &&
      s.state.pendingDecision === undefined,
  );
  return s;
}

describe("BT14-065 Vademon — KB Q&A rulings", () => {
  it("performs De-Digivolve 1 once per revealed Digimon, always trashing three cards rather than a chosen 1-3 (Q2437)", async () => {
    const threeDigimon = await playVademonAgainstRevealedDeck(["BT14-055", "BT14-061", "BT1-009"]);

    expect(threeDigimon.state.players[1]!.trash.map((card) => card.cardId)).toEqual([
      "BT14-067",
      "BT14-064",
      "BT3-085",
    ]);
    expect(threeDigimon.perm("target").topCard.cardId).toBe("BT14-061");
    expect(deDigivolveCountPrompts(threeDigimon)).toEqual([]);

    const twoDigimon = await playVademonAgainstRevealedDeck(["BT14-055", "BT14-089", "BT1-009"]);

    expect(twoDigimon.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT14-067", "BT14-064"]);
    expect(twoDigimon.perm("target").topCard.cardId).toBe("BT3-085");
  });

  it("lets Vademon's player, not the revealing opponent, choose top or bottom and the order of the returned cards (Q2438)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-065", as: "vademon" }] },
        1: {
          deck: [
            { card: "BT14-055", as: "first" },
            { card: "BT14-082", as: "second" },
            { card: "BT14-089", as: "third" },
            { card: "BT1-013", as: "unrevealedA" },
            { card: "BT1-014", as: "unrevealedB" },
          ],
          battleArea: [{ card: "BT14-067", as: "target", under: ["BT14-064"] }],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vademon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const placement = s.decisions.at(-1)!;
    expect(placement.seat).toBe(0);
    expect(placement.req.options?.choices).toEqual(["Top of deck", "Bottom of deck"]);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: placement.req.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placement.req.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!;
    expect(ordering.seat).toBe(0);
    const chosenOrder = [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.req.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.deck.length === 5 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("unrevealedA").instanceId,
      s.inst("unrevealedB").instanceId,
      ...chosenOrder,
    ]);
    expect(s.decisions.filter(({ seat }) => seat === 1)).toEqual([]);
  });
});

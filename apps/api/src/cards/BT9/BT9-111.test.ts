import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-111.js";
import "./BT9-111.js";
import "./BT9-109.js";

describe("BT9-111 Alphamon: Ouryuken", () => {
  it("matches catalog values and alternate evolution, tie-delete, and return-count IR", () => {
    expect(getCardDefinition("BT9-111")).toMatchObject({
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 16000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 7 }],
      types: ["NODATA", "Royal Knight", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { namesExact: ["Alphamon"], cost: 3, isAlternate: true, minNameStackCount: 1, minNameStackNames: ["Ouryumon"] },
      ],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [{ kind: "Delete", target: { count: "all", filter: { superlative: "highestPlayCost" } } }],
        },
        {
          trigger: "EndOfYourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Return",
              to: "deckBottom",
              order: "any",
              optional: true,
              trackCount: "bt9-111-returned",
              target: { count: 7, upTo: true, filter: { zone: "digivolutionCards", excludeKind: ["Digi-Egg"] } },
            },
            { kind: "GainMemory", scaling: { unit: "namedCount", countSource: "bt9-111-returned" } },
          ],
        },
      ],
    });
  });

  it("deletes every opposing Digimon tied for the highest play cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-111", as: "base" }], hand: [{ card: "BT9-111", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT2-047", as: "high1" },
            { card: "BT2-047", as: "high2" },
            { card: "BT1-015", as: "low" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("low").permanentId);
  });

  it("converts the BT6 Alphamon and Ouryumon stack into an end-of-turn memory loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT6-111",
              as: "alphamon",
              under: ["BT8-069", "BT9-064"],
            },
          ],
          hand: [{ card: "BT9-111", as: "ouryuken" }],
          deck: ["BT1-063"],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "highestOne" },
            { card: "BT2-047", as: "highestTwo" },
            { card: "BT1-015", as: "survivor" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("alphamon").permanentId,
        instanceId: s.inst("ouryuken").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("alphamon").topCard.cardId === "BT9-111" &&
        s.state.players[1]!.battleArea.length === 1 &&
        s.state.memory === -1,
      5000,
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("alphamon"));

    expect(s.state.memory).toBe(2);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("survivor").permanentId);
    expect(s.perm("alphamon").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT6-111", "BT8-069", "BT9-064"]),
    );
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "orderCards")).toHaveLength(1);
  });
});

describe("BT9-111 Alphamon: Ouryuken — KB Q&A rulings", () => {
  it("keeps the same turn going when its end-of-turn memory gain brings memory back to 0 (Q1926)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT9-111",
              as: "ouryuken",
              under: [
                { card: "BT9-064", as: "grademon" },
                { card: "BT9-109", as: "xAntibody" },
              ],
            },
          ],
          hand: [{ card: "BT1-009", as: "crossingPlay" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crossingPlay").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ouryuken").stack.length === 0 && s.state.memory === 0);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.events.some((event) => event.kind === "turnEnded")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.events.filter((event) => event.kind === "turnEnded")).toEqual([
      expect.objectContaining({ endingSeat: 0 }),
    ]);
  });

  it("can return X Antibody from its digivolution cards to the deck bottom because that is not trashing (Q1927)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT9-111",
              as: "ouryuken",
              under: [
                { card: "BT1-009", as: "nonXAntibody" },
                { card: "BT9-109", as: "xAntibody" },
              ],
            },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("ouryuken").permanentId,
      [s.inst("xAntibody").instanceId],
      0,
    );
    expect(s.perm("ouryuken").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("nonXAntibody").instanceId,
      s.inst("xAntibody").instanceId,
    ]);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("ouryuken"));

    expect(s.perm("ouryuken").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("nonXAntibody").instanceId]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT9-109"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });
});

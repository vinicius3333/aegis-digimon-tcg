import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-111.js";
import "./BT9-111.js";

describe("BT9-111 Alphamon: Ouryuken", () => {
  it("matches catalog values and alternate evolution, tie-delete, and return-count IR", () => {
    expect(getCardDefinition("BT9-111")).toMatchObject({
      colors: ["Black"], kinds: ["Digimon"], level: 7, playCost: 15, dp: 16000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 7 }], types: ["NODATA", "Royal Knight", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Alphamon"], cost: 3, isAlternate: true, minNameStackCount: 1, minNameStackNames: ["Ouryumon"] }],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { count: "all", filter: { superlative: "highestPlayCost" } } }] },
        { trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [{ kind: "Return", to: "deckBottom", order: "any", optional: true, trackCount: "bt9-111-returned", target: { count: 7, upTo: true, filter: { zone: "digivolutionCards", excludeKind: ["Digi-Egg"] } } }, { kind: "GainMemory", scaling: { unit: "namedCount", countSource: "bt9-111-returned" } }] },
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
    // "You may return" is the one optional choice. Once cards were returned,
    // "if you do, gain" is mandatory and must not create a second UI prompt.
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "orderCards")).toHaveLength(1);
  });
});

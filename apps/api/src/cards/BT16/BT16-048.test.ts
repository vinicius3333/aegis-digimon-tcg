import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-048.js";
import "../index.js";

describe("BT16-048", () => {
  it("plays an Insectoid or Larva from hand with 8 cost reduction", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 8, optional: true }],
    });
  });

  it("is immune to opponent Digimon effects while suspended", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          grant: "immuneToOpponentDigimonEffects",
          duration: "permanent",
          condition: { kind: "selfIsSuspended" },
        },
      ],
    });
  });

  it("bottom-decks an opposing Digimon using another suspended Digimon once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "deckBottom", optional: true, abortOnDecline: true, cost: { kind: "suspend" } }],
    });
    expect(digivolutionRequirementsFor("BT16-048")).toEqual([
      { level: 6, traits: ["Insectoid"], cost: 2, isAlternate: true, playCostLte: 13 },
    ]);
  });

  it("suspends another own Digimon and bottom-decks an opposing Digimon within its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-048", as: "tyrant", dp: 14000 },
            { card: "BT16-042", as: "cost", dp: 5000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).runTurn(0);

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("plays an Insectoid from hand at the printed 8-cost reduction when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-045", as: "base" }],
          hand: [{ card: "BT16-048", as: "tyrant" }, { card: "BT16-042", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-042"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-042")).toBe(true);
  });

  it("uses the level-6 Insectoid alternate evolution route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-046", as: "base" }], hand: [{ card: "BT16-048", as: "tyrant" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrant").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-048");

    expect(s.state.memory).toBe(0);
  });
});

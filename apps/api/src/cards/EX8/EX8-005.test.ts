import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-005.js";

describe("EX8-005", () => {
  it("matches the catalog's Digi-Egg identity and inherited text", () =>
    expect(getCardDefinition("EX8-005")).toMatchObject({
      cardId: "EX8-005",
      nameEn: "Tumblemon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Rock", "LIBERATOR"],
      evoCosts: [],
      inheritedEffectText:
        "When this card is trashed from the digivolution cards of a Digimon with the [Mineral]/[Rock]\u00a0trait, gain 1 memory.",
    }));

  it("inherits gaining 1 memory when discarded from a Mineral or Rock host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardsDiscardedBatch",
      sourceFilter: { isSelfRef: true },
      hostFilter: { nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));

  it.each([
    ["EX8-047", 5],
    ["EX8-046", 5],
    ["BT2-055", 6],
  ] as const)("checks the %s host after an opposing public On Play discards Tumblemon", async (host, memory) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-022", as: "frigimon" }] },
        1: { battleArea: [{ card: host, as: "host", under: [{ card: "EX8-005", as: "discarded" }] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const sourceId = s.inst("discarded").instanceId;
    const playedId = s.inst("frigimon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === sourceId));
    await settle(() => s.state.memory === memory);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(true);
    // Frigimon costs 5 and gains 1 after removing the last source. Tumblemon's
    // opposing-controller memory gain subtracts 1 only for Mineral/Rock hosts.
    expect(s.state.memory).toBe(memory);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not gain memory when another digivolution card is trashed but Tumblemon remains in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX8-048",
            as: "host",
            under: [
              { card: "EX8-005", as: "tumblemon" },
              { card: "EX8-046", as: "otherSource" },
            ],
          },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("otherSource").instanceId],
      0,
    );
    expect(s.state.memory).toBe(0);
  });

  it("carries the inherited trigger through a legal hatch, evolution, and move to battle", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["EX8-005"],
          deck: ["BT1-045", "BT1-045", "BT1-045"],
          hand: [{ card: "EX8-047", as: "sunarizamon" }],
        },
        1: { deck: ["BT1-045", "BT1-045", "BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const firstTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.players[0]!.breeding?.topCard.cardId === "EX8-005");
    const egg = s.state.players[0]!.breeding!;

    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: s.inst("sunarizamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => egg.topCard.cardId === "EX8-047");
    expect(egg.stack.map((card) => card.cardId)).toEqual(["EX8-005"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await firstTurn;

    s.state.memory = 0;
    const secondTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0 && s.state.turnCount === 2);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: egg.permanentId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.players[0]!.battleArea.length === 1);

    await advance(s.engine).verb.trashDigivolutionCards(egg.permanentId, [egg.stack[0]!.instanceId], 0);
    await settle(() => s.state.memory === 1 && s.state.players[0]!.trash.some((card) => card.cardId === "EX8-005"));
    expect(s.state.memory).toBe(1);
    expect(egg.stack).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await secondTurn;
  });
});

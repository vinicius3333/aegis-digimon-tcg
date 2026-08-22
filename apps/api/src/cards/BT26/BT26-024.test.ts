import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-024.js";
import "../index.js";

const CARD_ID = "BT26-024";

describe("BT26-024 Tinkermon", () => {
  it("encodes normal WG evolution, other-trait play watcher, and free digivolution", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["WG"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: { excludeSelf: true },
            actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true }],
          },
        ],
      },
    ]);
  });

  it("publicly reacts to another trait Digimon's play and digivolves without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tinkermon" }],
          hand: [
            { card: "BT26-034", as: "playedVegetation" },
            { card: "BT26-027", as: "petermon" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedVegetation").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tinkermon").topCard.instanceId === s.inst("petermon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("may decline the triggered digivolution without spending memory or moving the hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tinkermon" }],
          hand: [
            { card: "BT26-034", as: "playedVegetation" },
            { card: "BT26-027", as: "petermon" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedVegetation").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tinkermon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("petermon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("does not react to the opponent playing a matching Digimon on their turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "tinkermon" }],
        hand: [{ card: "BT26-027", as: "petermon" }],
      },
      1: { hand: [{ card: "BT26-034", as: "opponentVegetation" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = -3;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentVegetation").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("tinkermon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("petermon").instanceId);
  });

  it("grants inherited Barrier only while Tinkermon is under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-027", as: "host", under: [{ card: CARD_ID, as: "source" }] },
          { card: CARD_ID, as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });
});

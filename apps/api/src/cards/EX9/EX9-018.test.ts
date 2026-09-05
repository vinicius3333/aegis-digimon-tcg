import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-018.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-018", () => {
  it("reduces its play cost by trashing a Cyborg or Ver.2 card and trashes one opposing digivolution card by placing a trash Digimon underneath", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Cyborg", "Ver.2"], match: "trait" }],
              },
            },
          },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 1,
        choose: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
        cost: { kind: "place", destination: "digivolutionStack", faceDown: true },
      });
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[1]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
      });
    }
  });

  it("trashes an eligible hand card and reduces the play cost by exactly 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-017", as: "payment" },
            { card: "EX9-018", as: "source" },
          ],
          trash: ["EX9-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId }).ok).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-018"));
    expect(before - s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(false);
  });

  it("uses one trash Digimon to trash one stack card, then bottoms an opposing Digimon with no stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-018", as: "source" }], trash: ["EX9-017"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-001"] }],
          deck: ["BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-017")).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-009"]);
  });

  it("does not resolve the then-return when the required trash Digimon cannot be placed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-018", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "sourceLess" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).not.toBe("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places its paid source at the bottom during a real normal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-037", as: "host" }],
          hand: [{ card: "EX9-018", as: "evo" }],
          trash: ["BT1-009"],
          deck: ["BT1-048"],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-010"] }],
          deck: ["BT1-049"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-018");
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "BT1-009", faceUp: false },
      { cardId: "BT1-037", faceUp: true },
    ]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-049", "BT1-015"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

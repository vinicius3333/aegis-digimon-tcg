import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-018.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-018", () => {
  it.each([
    { base: "BT6-064", cost: 1, legal: true },
    { base: "EX9-029", cost: 3, legal: true },
    { base: "BT1-015", cost: 0, legal: false },
  ])("checks the alternate evolution route from $base", async ({ base, cost, legal }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "host" }],
          hand: [{ card: "EX9-018", as: "evo" }],
          trash: ["BT1-009"],
          deck: ["BT1-048"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(legal);
    await settle();

    expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-018" : base);
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual(
      legal ? [{ cardId: base, faceUp: true }] : [],
    );
    expect(s.state.memory).toBe(5 - cost);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-048"] : ["EX9-018"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(legal ? [] : ["BT1-048"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines the On Play trash-placement cost without trashing or returning the target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-018", as: "source" }], trash: ["BT1-048"] },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-010"] }], deck: ["BT1-046"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("pays the trash placement and returns an opponent Digimon even when it has no sources", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-018", as: "source" }], trash: ["BT1-048"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-046"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "BT1-048", faceUp: false },
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046", "BT1-009"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines the When Digivolving trash-placement cost without changing the opponent stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-037", as: "host" }],
          hand: [
            { card: "EX9-018", as: "evo" },
            { card: "BT1-048", as: "payment" },
          ],
          trash: ["BT1-049"],
          deck: ["BT1-046"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-010"] }], deck: ["BT1-046"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
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
      { cardId: "BT1-037", faceUp: true },
    ]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-046"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-049"]);
    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-015"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

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
        kind: "ConditionalBranch",
        condition: { kind: "true" },
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          faceDown: true,
          target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1 },
        },
        ifTrue: [
          {
            kind: "TrashDigivolution",
            amount: 1,
            choose: true,
            target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
          },
          { kind: "Return", to: "deckBottom" },
        ],
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
        0: { hand: [{ card: "EX9-018", as: "source" }], trash: ["EX9-017"] },
        1: {
          battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-001"] }],
          deck: ["BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "EX9-017", faceUp: false },
    ]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-017")).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT1-009"]);
  });

  it("scales to two hidden cards on one chosen opponent Digimon and preserves its peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-017", as: "host", under: [{ card: "EX9-016", faceUp: false }] }],
          hand: [{ card: "EX9-018", as: "evo" }],
          trash: ["BT1-028"],
          deck: ["BT1-048"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "target", under: ["BT1-012", "BT1-015"] },
            { card: "BT1-019", as: "peer", under: ["BT1-011"] },
          ],
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
      { cardId: "BT1-028", faceUp: false },
      { cardId: "EX9-016", faceUp: false },
      { cardId: "EX9-017", faceUp: true },
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-012", "BT1-015"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-019"]);
    expect(s.perm("peer").stack.map(({ cardId }) => cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-049", "BT1-024"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not resolve the then-return when the required trash Digimon cannot be placed", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-018", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "sourceLess" }], deck: ["BT1-048"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
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

  it("unsuspends its inherited host at the end of your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST2-10", as: "host", under: ["EX9-018"] }],
        deck: ["BT1-048"],
      },
    });
    const turn = s.engine.runOneTurn();
    await settle();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.perm("host").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("host").isSuspended).toBe(false);
    // A second effect-window dispatch before another turn must not reuse the inherited effect.
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q4759 keeps the optional reduction payment when effect-played for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-017", as: "payment" },
            { card: "EX9-018", as: "source" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const before = s.state.memory;
    const play = advance(s.engine).verb.playInstances([s.inst("source").instanceId]);
    await settle();
    expect(s.state.pendingDecision?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle();
    // Decline the separate On Play cost so the reducer's trash payment remains observable.
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-017"]);
    expect(s.state.pendingDecision?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await play;
    await settle();

    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-018");
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-017"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces the paid play cost with a Cyborg-only payment branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-030", as: "payment" },
            { card: "EX9-018", as: "source" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "EX9-030", faceUp: false },
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("preserves the reducer payment when its optional cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-017", as: "payment" },
            { card: "EX9-018", as: "source" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-017"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

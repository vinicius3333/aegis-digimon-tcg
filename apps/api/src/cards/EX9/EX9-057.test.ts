import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX9-057.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import "../index.js";

describe("EX9-057", () => {
  it("Q4821 does not pay the breeding-only return cost from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-057", as: "source" }],
          trash: ["EX9-005", "EX9-005", "EX9-005", "EX9-005"],
          security: ["BT1-010", "BT1-048"],
        },
        1: { battleArea: [{ card: "BT10-064", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([
      "EX9-005",
      "EX9-005",
      "EX9-005",
      "EX9-005",
      "BT1-010",
    ]);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([false, true])(
    "keeps Core in breeding when four-Negamon payment is incomplete or refused (decline=%s)",
    async (decline) => {
      const cards = Array.from({ length: decline ? 4 : 3 }, () => "EX9-005");
      const s = setupEngine(
        {
          0: {
            breeding: { card: "EX9-057", as: "source" },
            trash: cards,
            eggDeck: ["BT1-001"],
            security: ["BT1-010", "BT1-048"],
          },
          1: { battleArea: [{ card: "BT10-064", as: "attacker" }] },
        },
        { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("EX9-057");
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([...cards, "BT1-010"]);
      expect(s.state.players[0]!.eggDeck.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
      expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("forces a non-Blocker through Collision, performs two Piercing checks, and Reboots on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-057", as: "source" }] },
      1: {
        battleArea: [{ card: "BT10-064", as: "defender" }],
        security: ["BT1-010", "BT1-048", "BT1-046"],
        deck: ["BT1-010"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      mustBlock: true,
      eligibleBlockerIds: [s.perm("defender").permanentId],
    });
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("defender").permanentId }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-064", "BT1-010", "BT1-048"]);
    expect(s.perm("source").isSuspended).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await advance(s.engine).runTurn(1);
    await settle();
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([true, false])(
    "evolves publicly and places the exact three-card cost above its original sources (Abbadomon=%s)",
    async (alternate) => {
      const base = alternate ? "EX9-055" : "BT2-064";
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base", under: ["EX9-054"] }],
            hand: [{ card: "EX9-057", as: "evo" }],
            deck: ["BT1-046"],
            trash: ["EX9-047", "EX9-048", "EX9-055"],
          },
          1: { battleArea: [{ card: "BT10-062" }, { card: "BT10-062" }, { card: "BT10-064" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: alternate,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("base").topCard.cardId).toBe("EX9-057");
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([
        "EX9-054",
        base,
        "EX9-047",
        "EX9-048",
        "EX9-055",
      ]);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT10-064"]);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-062", "BT10-062"]);
      expect(s.state.memory).toBe(alternate ? 6 : 5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each(["EX9-005", "EX9-057", "BT1-010"])(
    "Q4818 does not partially pay with only two eligible cards and excluded %s",
    async (excluded) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT2-064", as: "base" }],
            hand: [{ card: "EX9-057", as: "evo" }],
            deck: ["BT1-046"],
            trash: ["EX9-047", "EX9-048", excluded],
          },
          1: { battleArea: [{ card: "BT10-062" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT2-064"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-047", "EX9-048", excluded]);
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT10-062"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("requires the exact Abbadomon name and rejects an Abbadomon Core base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-057", as: "host" }], hand: [{ card: "EX9-057", as: "evo" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-057");
    expect(s.state.memory).toBe(10);
  });
  it("Q4816/Q4819 pays mixed-zone Negamon, resolves When Moving, then blocks the same real attack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX9-057", as: "source" },
          // Negamon's breeding Main effect can play Eyesmon and place itself directly underneath.
          battleArea: [
            { card: "EX9-047", as: "first", under: ["EX9-005"] },
            { card: "EX9-047", as: "second", under: ["EX9-005"] },
          ],
          trash: ["EX9-005", "EX9-005", "EX9-047", "EX9-048", "EX9-055"],
          eggDeck: ["BT1-001"],
          security: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT2-064", as: "attacker" },
            { card: "BT10-062", as: "lowestOne" },
            { card: "BT10-062", as: "lowestTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(true);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[0]!.eggDeck.map(({ cardId }) => cardId)).toEqual([
      "BT1-001",
      "EX9-005",
      "EX9-005",
      "EX9-005",
      "EX9-005",
    ]);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-047", "EX9-048", "EX9-055"]);
    expect(s.perm("source").stack.every(({ faceUp }) => faceUp)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT2-064"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-062", "BT10-062"]);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("source").permanentId })).toEqual(
      { ok: true },
    );
    await settle();
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
  });
  it("moves from breeding to battle when an opponent attacks by returning four exact named Negamon from trash or stacks to the bottom of the Digi-Egg deck", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isBreeding: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "MovePermanent",
              direction: "toBattle",
              cost: {
                kind: "return",
                target: {
                  count: 4,
                  filter: {
                    zone: ["trash", "digivolutionCards"],
                    controller: "mine",
                    kind: ["Digimon", "DigiEgg"],
                    nameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
                  },
                },
              },
            },
          ],
        },
      ],
    }));
  it("gains Collision, Piercing, and Security A. +1", () =>
    expect(
      compiled.effects
        ?.filter((entry) => entry.actions.some((action) => action.kind === "GainKeyword"))
        .flatMap((entry) =>
          entry.actions.flatMap((action) => (action.kind === "GainKeyword" ? [action.keyword.keyword] : [])),
        ),
    ).toEqual(expect.arrayContaining(["Collision", "Piercing", "SecurityAttack"])));
  it("places three level-six-or-lower Negamon-text Digimon from trash underneath during digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "place", target: { count: 3 }, position: "top" },
    }));
  it("shares the exact three-card top-stack cost across moving, digivolving, and attacking", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" },
        cost: {
          target: {
            count: 3,
            from: ["trash"],
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 6 },
              nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
            },
          },
          destination: "digivolutionStack",
          position: "top",
          host: "self",
        },
      });
  });
  it("returns four named Negamon cards and moves from breeding when an opponent attacks", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "EX9-057", as: "source" }, trash: ["EX9-005", "EX9-005", "EX9-005", "EX9-005"] },
        1: { battleArea: [{ card: "EX9-050", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-057"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-057")).toBe(true);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId).slice(-4)).toEqual([
      "EX9-005",
      "EX9-005",
      "EX9-005",
      "EX9-005",
    ]);
  });

  it("does not move from breeding when the four cards only mention Negamon", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "EX9-057", as: "source" }, trash: ["EX9-047", "EX9-048", "EX9-054", "EX9-055"] },
        1: { battleArea: [{ card: "EX9-050", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("EX9-057");
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
  });

  it.each([
    ["When Moving", EffectTiming.WhenMoving],
    ["When Digivolving", EffectTiming.WhenDigivolving],
  ] as const)(
    "places exactly three top-stack cards and deletes the opponent's lowest level on %s",
    async (_label, timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX9-057", as: "source" }], trash: ["EX9-047", "EX9-048", "EX9-054"] },
          1: {
            battleArea: [
              { card: "EX9-054", as: "higher" },
              { card: "EX9-050", as: "lowest" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );

      await advance(s.engine).fire(timing, s.perm("source"));
      await settle(() => s.state.pendingDecision === undefined && s.perm("source").stack.length === 3);

      expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX9-047", "EX9-048", "EX9-054"]);
      expect(s.perm("source").stack.every((card) => card.faceUp !== false)).toBe(true);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-050")).toBe(false);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-054")).toBe(true);
    },
  );

  it("places the three-card cost and deletes the lowest level through a real attack intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-057", as: "source" }], trash: ["EX9-047", "EX9-048", "EX9-054"] },
        1: { battleArea: [{ card: "EX9-050", as: "lowest" }], security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("source").stack.length === 3);

    expect(s.perm("source").stack).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("leaves the stack and opposing Digimon unchanged when the three-card effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-057", as: "source" }], trash: ["EX9-047", "EX9-048", "EX9-054"] },
        1: { battleArea: [{ card: "EX9-050", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-050")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-047", "EX9-048", "EX9-054"]);
  });
});

import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-053.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-053", () => {
  it.each([undefined, true, false])(
    "unlocks a cost-5 DM card only with a face-down source (faceUp=%s)",
    async (faceUp) => {
      const eligible = faceUp === false;
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-050", as: "source", under: faceUp === undefined ? [] : [{ card: "EX9-046", faceUp }] },
            ],
            hand: [{ card: "EX9-053", as: "evo" }],
            deck: ["BT1-046", "EX9-009", "BT1-009", "BT1-010", "BT1-048"],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
        eligible ? ["EX9-053", "EX9-009"] : ["EX9-053"],
      );
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(
        eligible ? ["BT1-048", "BT1-009", "BT1-010"] : ["BT1-048", "EX9-009", "BT1-009", "BT1-010"],
      );
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each(["EX9-009", "BT1-016"])("permits off-color level-4 evolution only with DM: %s", async (base) => {
    const eligible = base === "EX9-009";
    const s = setupEngine({
      0: { breeding: { card: base, as: "source" }, hand: [{ card: "EX9-053", as: "evo" }], deck: ["BT1-010"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(eligible);
    await settle();
    expect(s.perm("source").topCard.cardId).toBe(eligible ? "EX9-053" : base);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
    expect(s.state.memory).toBe(eligible ? 2 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("forces a non-Blocker to block through Collision and wins the battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-053", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender" }], security: ["BT1-010"] },
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
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Collision and reveals three to play one DM Digimon or Tamer with scaled play-cost limit", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Collision"))?.keywords,
    ).toContainEqual({ keyword: "Collision", raw: "＜Collision＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            to: "play",
            optional: true,
            filter: { playCostLte: 4, playCostLteScaling: { per: 1, unit: "selfFaceDownDigivolutionCards" } },
          },
        ],
      });
  });
  it("inherits once-per-turn de-digivolve one when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "DeDigivolve", amount: 1 }],
    }));
  it("keeps both Digimon and Tamer DM cards eligible and bottoms every unrecruited reveal", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        revealCount: 3,
        add: [
          {
            count: 1,
            to: "play",
            optional: true,
            filter: {
              controllerDefault: "mine",
              playCostLte: 4,
              playCostLteScaling: { per: 1, unit: "selfFaceDownDigivolutionCards" },
              nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
            },
          },
        ],
        rest: "deckBottom",
      });
  });
  it("reveals three, plays the qualifying DM card, and bottoms the unrecruited cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-053", as: "source" }],
          deck: ["EX9-050", "BT1-009", "BT1-010", "BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-050")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048", "BT1-009", "BT1-010"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reveals three on digivolution and can play a qualifying DM Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "source" }],
          hand: [{ card: "EX9-053", as: "evo" }],
          deck: ["BT1-046", "EX9-068", "BT1-009", "BT1-010", "BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-068")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048", "BT1-009", "BT1-010"]);
    expect(s.perm("source").topCard.cardId).toBe("EX9-053");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-050"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("bottoms all reveals after explicit refusal (digivolve=%s)", async (digivolve) => {
    const s = setupEngine(
      {
        0: {
          battleArea: digivolve ? [{ card: "EX9-050", as: "source" }] : [],
          hand: [{ card: "EX9-053", as: "evo" }],
          deck: [...(digivolve ? ["BT1-046"] : []), "EX9-050", "BT1-009", "BT1-010", "BT1-048"],
        },
      },
      { autoOrderCards: true },
    );

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(
        0,
        digivolve
          ? { type: "digivolve", permanentId: s.perm("source").permanentId, instanceId: s.inst("evo").instanceId }
          : { type: "playCard", instanceId: s.inst("evo").instanceId },
      ),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-053");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048", "EX9-050", "BT1-009", "BT1-010"]);
    expect(s.state.memory).toBe(digivolve ? 7 : 3);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(digivolve ? ["BT1-046"] : []);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("de-digivolves only once across two real attacks from a legal inherited host", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-064", as: "host", under: ["EX9-053"] }], security: ["BT1-090"] },
        1: {
          battleArea: [
            { card: "EX9-055", as: "target", under: ["EX9-054"] },
            { card: "BT10-065", as: "peer", under: ["BT10-062"] },
          ],
          security: ["BT1-010", "BT1-048"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("target").topCard.cardId).toBe("EX9-054");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    preferred.splice(0, preferred.length, s.perm("peer").permanentId);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("peer").topCard.cardId).toBe("BT10-065");
    expect(s.perm("peer").stack.map(({ cardId }) => cardId)).toEqual(["BT10-062"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

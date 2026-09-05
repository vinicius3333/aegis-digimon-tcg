import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-060.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-060", () => {
  it.each([true, false])(
    "uses the off-color DM route and allows declining the payable digivolution draw (DM=%s)",
    async (dm) => {
      const base = dm ? "EX9-007" : "BT1-010";
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "host" }],
            hand: [{ card: "EX9-060", as: "evo" }, "BT1-048"],
            deck: ["BT1-046", "BT1-009"],
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: true,
        }).ok,
      ).toBe(dm);
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(dm ? "EX9-060" : base);
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(dm ? [base] : []);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
        dm ? ["BT1-048", "BT1-046"] : ["EX9-060", "BT1-048"],
      );
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(dm ? ["BT1-009"] : ["BT1-046", "BT1-009"]);
      expect(s.state.memory).toBe(dm ? 3 : 5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([false, true])("activates Training to place a bottom face-down source (breeding=%s)", async (breeding) => {
    const host = { card: "EX9-060", as: "host", under: ["EX9-058"] };
    const s = setupEngine({
      0: { ...(breeding ? { breeding: host } : { battleArea: [host] }), deck: ["BT1-010", "BT1-048"] },
    });
    await s.ready();
    const sourceInstanceId = s.perm("host").topCard.instanceId;
    const ability = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceInstanceId);
    expect(ability).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: ability!.effectKey }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", "EX9-058"]);
    expect(s.perm("host").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: ability!.effectKey }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not draw when an attacking Devidramon has no hand card to place", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-060", as: "host" }], deck: ["BT1-046"] },
        1: { security: ["BT1-010", "BT1-048"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Training and once per turn draws one by placing a hand card underneath on digivolution or attack", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords,
    ).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          { kind: "Draw", amount: 1, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } },
        ],
      });
  });
  it("inherits deletion of an opposing level-four-or-lower Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    }));
  it("shares the once-per-turn identity and exact hand placement cost across both triggers", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        optional: true,
        abortOnDecline: true,
        cost: {
          target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          faceDown: true,
        },
      });
    expect(
      compiled.effects
        ?.filter((entry) => ["WhenDigivolving", "WhenAttacking"].includes(entry.trigger))
        .map((entry) => entry.sharedUseKey),
    ).toEqual(["ir-shared-0", "ir-shared-0"]);
  });
  it("places a hand card face-down underneath and draws one when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-058", as: "source" }],
          hand: ["BT1-009", { card: "EX9-060", as: "evo" }],
          deck: ["BT1-046", "BT1-010", "BT1-048"],
        },
        1: { security: ["BT1-010", "BT1-048"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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

    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-058"]);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046", "BT1-010"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-058"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046", "BT1-010"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes an opposing level-four-or-lower Digimon when the inherited host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host", under: ["EX9-060"], suspended: true }],
          security: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT10-064", as: "attacker" },
            { card: "BT10-062", as: "target" },
            { card: "BT10-062", as: "peer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT2-075", "EX9-060"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT10-064", "BT10-062"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-062"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places a hand card and draws through a real attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-060", as: "source" }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
          security: ["BT1-090"],
        },
        1: { battleArea: [{ card: "EX9-050", as: "target" }], security: ["BT1-010", "BT1-048"] },
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
    await settle();

    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the hand and deck unchanged when the optional attack draw is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-060", as: "source" }], hand: ["BT1-009"], deck: ["BT1-010"] },
        1: { security: ["BT1-010", "BT1-048"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("source").isSuspended).toBe(true);

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});

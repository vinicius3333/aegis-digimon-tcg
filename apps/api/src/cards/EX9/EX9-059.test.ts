import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-059.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-059", () => {
  it.each([true, false])(
    "evolves only from a matching off-color DM and explicitly declines the payable effect (DM=%s)",
    async (dm) => {
      const base = dm ? "EX9-007" : "BT1-010";
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "source" }],
            hand: [{ card: "EX9-059", as: "evo" }, "BT1-048"],
            deck: ["BT1-046"],
          },
          1: { battleArea: [{ card: "BT10-062", as: "target" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: true,
        }).ok,
      ).toBe(dm);
      await settle();
      expect(s.perm("source").topCard.cardId).toBe(dm ? "EX9-059" : base);
      expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(dm ? [base] : []);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
        dm ? ["BT1-048", "BT1-046"] : ["EX9-059", "BT1-048"],
      );
      expect(s.perm("target").topCard.cardId).toBe("BT10-062");
      expect(s.state.memory).toBe(dm ? 3 : 5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each([false, true])(
    "uses Training to suspend and place a bottom face-down source (breeding=%s)",
    async (breeding) => {
      const host = { card: "EX9-059", as: "host", under: ["EX9-058"] };
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
    },
  );

  it("does not delete an eligible opponent without a hand card to pay", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-059", as: "source" }] },
        1: { battleArea: [{ card: "BT10-062", as: "target" }], security: ["BT1-010", "BT1-048"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("BT10-062");
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Training and once per turn deletes an opposing level-four-or-lower Digimon on digivolving or attacking after placing a hand card underneath", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords,
    ).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Delete",
            target: { filter: { levelComparison: { op: "lte", value: 4 } } },
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
        ],
      });
  });
  it("inherits once-per-turn draw one and trash one when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", target: { filter: { zone: "hand" } } },
      ],
    }));
  it("shares one once-per-turn identity across digivolving and attacking", () => {
    const effects = ["WhenDigivolving", "WhenAttacking"].map((trigger) =>
      compiled.effects?.find((entry) => entry.trigger === trigger),
    );
    expect(effects[0]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          optional: true,
          abortOnDecline: true,
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
          cost: {
            target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
        },
      ],
    });
    expect(effects[1]).toMatchObject({ sharedUseKey: "ir-shared-0" });
  });
  it("places a hand card face-down underneath and deletes an opposing level-four Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-058", as: "source" }],
          hand: ["BT1-009", { card: "EX9-059", as: "evo" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT10-064", as: "higher" },
            { card: "BT10-062", as: "target" },
            { card: "BT10-062", as: "second" },
          ],
          security: ["BT1-010", "BT1-048"],
        },
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
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-062"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("second").topCard.cardId).toBe("BT10-062");
    expect(s.perm("higher").topCard.cardId).toBe("BT10-064");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-058"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws then trashes one card when the inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host", under: ["EX9-059"] }],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-048"],
          security: ["BT1-090"],
        },
        1: { security: ["BT1-010", "BT1-048", "BT1-046"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places a hand card and deletes an opposing level-four Digimon through a real attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-059", as: "source" }],
          hand: ["BT1-009"],
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
    await settle(() => s.perm("source").stack.length === 1 && s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("leaves the hand and opposing Digimon unchanged when the optional attack effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-059", as: "source" }], hand: ["BT1-009"] },
        1: { battleArea: [{ card: "EX9-050", as: "target" }], security: ["BT1-010", "BT1-048"] },
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
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-050")).toBe(true);
  });
});

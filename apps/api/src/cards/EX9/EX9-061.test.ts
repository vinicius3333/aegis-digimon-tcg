import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX9-061.js";
import "../index.js";

describe("EX9-061", () => {
  it.each([
    ["EX9-058", false, true],
    ["EX9-007", true, true],
    ["BT1-010", true, false],
  ] as const)("validates normal and DM evolution from %s (alternate=%s, legal=%s)", async (base, alternate, legal) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-061", as: "evo" }], deck: ["BT1-046"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-061" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-046"] : ["EX9-061"]);
    expect(s.state.memory).toBe(legal ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("uses Training in battle or breeding (breeding=%s)", async (breeding) => {
    const host = { card: "EX9-061", as: "host", under: ["EX9-058"] };
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
  it.each([
    [false, "BT10-062"],
    [true, "BT10-064"],
  ] as const)(
    "does not pay when the cost is unavailable or the projected ceiling is insufficient (deck=%s, target=%s)",
    async (hasDeck, target) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-061", as: "source", under: [{ card: "BT1-046", faceUp: false }, "EX9-058"] }],
            deck: hasDeck ? ["BT1-009"] : [],
          },
          1: { battleArea: [{ card: target, as: "target" }], security: ["BT1-010", "BT1-048"] },
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
      expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046", "EX9-058"]);
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(hasDeck ? ["BT1-009"] : []);
      expect(s.perm("target").topCard.cardId).toBe(target);
      expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each([
    [0, "BT1-010", "BT10-062"],
    [1, "BT10-062", "BT10-064"],
    [2, "BT10-062", "BT10-064"],
    [3, "BT10-064", "BT2-064"],
  ] as const)(
    "counts the paid face-down source and rounds down scaling (previous hidden=%s)",
    async (hidden, target, higher) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX9-061",
                as: "source",
                under: [...Array.from({ length: hidden }, () => ({ card: "BT1-046", faceUp: false })), "EX9-058"],
              },
            ],
            deck: ["BT1-009", "BT1-048"],
          },
          1: {
            battleArea: [
              { card: higher, as: "higher" },
              { card: target, as: "target" },
              { card: target, as: "peer" },
            ],
            security: ["BT1-010", "BT1-048", "BT1-046"],
          },
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
      expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual([
        "BT1-009",
        ...Array.from({ length: hidden }, () => "BT1-046"),
        "EX9-058",
      ]);
      expect(s.perm("source").stack.filter(({ faceUp }) => faceUp === false)).toHaveLength(hidden + 1);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual([target, "BT1-010"]);
      expect(s.perm("higher").topCard.cardId).toBe(higher);
      expect(s.perm("peer").topCard.cardId).toBe(target);
      await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("source").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
      expect(s.perm("source").stack.filter(({ faceUp }) => faceUp === false)).toHaveLength(hidden + 1);
      expect(s.perm("peer").topCard.cardId).toBe(target);
      expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("has Training and once per turn deletes an opposing Digimon with a level limit scaling by face-down sources when attacking", () => {
    expect(
      compiled.effects?.find((entry) => entry.actions.some((action) => action.kind === "GainKeyword"))?.actions,
    ).toContainEqual(expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Training" } }));
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0];
    expect(action).toMatchObject({
      kind: "Delete",
      cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
    });
    expect(action?.kind === "Delete" ? action.target.filter.levelComparison : undefined).toMatchObject({
      op: "lte",
      value: 3,
      scaling: { unit: "selfFaceDownDigivolutionCards", per: 2 },
    });
  });
  it("inherits Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toContainEqual(
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Retaliation" } }),
    ));
  it("places the own deck top face down for its attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-061", as: "source" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("source").stack.length === 1 && s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010"),
      20,
    );
    expect(s.perm("source").stack[0]?.faceUp).not.toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("leaves the deck and opposing Digimon unchanged when the optional attack effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-061", as: "source" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-010", "BT1-048"] },
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

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("grants Retaliation to a legal host through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-075", as: "host", under: ["EX9-061"], suspended: true }], security: ["BT1-010"] },
      1: { battleArea: [{ card: "BT10-064", as: "attacker" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
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
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT2-075", "EX9-061"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

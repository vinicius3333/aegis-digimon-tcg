import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-049.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX9-049", () => {
  it("once per turn digivolves at end of turn by placing three Ver.3 Digimon from trash underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          into: { nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] },
          cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack" },
        },
      ],
    }));
  it("requires all three cards and places them face down at the bottom of this stack", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: {
          count: 3,
          from: ["trash"],
          filter: { kind: ["Digimon"], zone: "trash", nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] },
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
        faceDown: true,
      },
    }));
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it.each(["EX9-007", "BT1-009"])("accepts an off-color level-3 base only with DM: %s", async (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-049", as: "evo" }], deck: ["BT1-010"] },
    });
    s.state.memory = 5;
    await s.ready();
    const eligible = base === "EX9-007";
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(eligible);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(eligible ? "EX9-049" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
    expect(s.state.memory).toBe(eligible ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects a non-Ver.3 evolution without processing its placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-049", as: "source" }],
          trash: ["EX9-023", "EX9-034", "EX9-029", "EX9-023", "EX9-034", "EX9-029"],
          hand: ["BT10-064"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-049");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(6);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each(["hand", "trash"] as const)(
    "places three Ver.3 cards face-down and evolves from %s at real turn end",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-049", as: "source", under: ["EX9-046"] }],
            trash: ["EX9-023", "EX9-034", "EX9-029", ...(zone === "trash" ? ["EX9-074"] : [])],
            hand: zone === "hand" ? ["EX9-074"] : [],
            deck: ["BT1-009", "BT1-010", "BT1-048"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;

      await advance(s.engine).runTurn(0);
      await settle();

      const stack = s.perm("source").stack;
      expect(
        stack
          .slice(0, 3)
          .map((card) => card.cardId)
          .sort(),
      ).toEqual(["EX9-023", "EX9-029", "EX9-034"]);
      expect(stack.slice(0, 3).every((card) => card.faceUp === false)).toBe(true);
      expect(stack.slice(3).map(({ cardId }) => cardId)).toEqual(["EX9-046", "EX9-049"]);
      expect(s.perm("source").topCard.cardId).toBe("EX9-074");
      expect(s.state.players[0]!.trash).toHaveLength(0);
      // The starting player's first turn skips its normal draw; this is the evolution bonus draw.
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-048"]);
      // Passing sets memory to -3; Kimeramon's normal level-4 evolution then costs 5.
      expect(s.state.memory).toBe(-8);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([false, true])(
    "preserves all zones when payment is unavailable or declined (decline=%s)",
    async (decline) => {
      const payment = decline ? ["EX9-023", "EX9-034", "EX9-029"] : ["EX9-023", "EX9-034", "BT1-009"];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-049", as: "source", under: ["EX9-046"] }],
            trash: payment,
            hand: ["EX9-074"],
            deck: ["BT1-010"],
          },
        },
        { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
      );
      s.state.memory = 5;
      await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
      await settle();
      expect(s.perm("source").topCard.cardId).toBe("EX9-049");
      expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-046"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(payment);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-074"]);
      expect(s.state.memory).toBe(5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("uses inherited Blocker in live combat", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT2-063", as: "blocker", under: ["EX9-049"] }], security: ["BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blocker"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

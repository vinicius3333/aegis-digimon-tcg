import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-050.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-050", () => {
  it("does not evolve into a legal black level 5 without Ver.1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "source" }],
          trash: ["EX9-007", "EX9-016", "EX9-061"],
          hand: ["BT10-064"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-050");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-007", "EX9-016", "EX9-061"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("does not activate twice after Security restores the same Numemon", async () => {
    const options = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-050", as: "source" },
            { card: "BT1-009", as: "decoy" },
          ],
          trash: ["EX9-007", "EX9-016", "EX9-061", "EX9-007", "EX9-016", "EX9-061"],
          hand: ["EX9-053"],
          deck: ["BT1-010", "BT1-046", "BT1-048", "BT1-009"],
        },
        1: { security: ["BT8-104"] },
      },
      options,
    );
    s.state.memory = 5;
    await s.ready();
    const originalId = s.perm("source").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-053");
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack).toHaveLength(4);
    options.autoSelectCards = false;
    options.autoAcceptOptional = false;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("source").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("source").topCard.cardId === "EX9-050" && s.state.pendingDecision?.kind === "chooseTargets",
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("decoy").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.instanceId).toBe(originalId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    const sourceIds = s.perm("source").stack.map(({ instanceId }) => instanceId);
    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(sourceIds).toHaveLength(3);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX9-007", "EX9-016", "EX9-061", "EX9-053"]),
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.instanceId).toBe(originalId);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual(sourceIds);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashIds);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each(["EX9-007", "BT1-009"])("accepts an off-color level-3 base only with DM: %s", async (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-050", as: "evo" }], deck: ["BT1-010"] },
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
    expect(s.perm("host").topCard.cardId).toBe(eligible ? "EX9-050" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
    expect(s.state.memory).toBe(eligible ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines a complete eligible payment without moving any cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "source" }],
          trash: ["EX9-007", "EX9-016", "EX9-061"],
          hand: ["EX9-053"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-050");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-007", "EX9-016", "EX9-061"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-053"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("once per turn digivolves at end of turn by placing three Ver.1 Digimon from trash underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          into: { nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }] },
          cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack" },
        },
      ],
    }));
  it("requires all three Ver.1 cards and places them face down at the bottom of this stack", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: {
          count: 3,
          from: ["trash"],
          filter: {
            zone: "trash",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }],
          },
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
  it.each(["hand", "trash"] as const)(
    "places three Ver.1 cards at real turn end and pays to evolve from %s",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-050", as: "source", under: ["EX9-046"] }],
            trash: ["EX9-007", "EX9-016", "EX9-061", ...(zone === "trash" ? ["EX9-053"] : [])],
            hand: zone === "hand" ? ["EX9-053"] : [],
            deck: ["BT1-009", "BT1-010", "BT1-046", "BT1-048"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 3;

      await advance(s.engine).runTurn(0);
      await settle();

      const stack = s.perm("source").stack;
      expect(
        stack
          .slice(0, 3)
          .map((card) => card.cardId)
          .sort(),
      ).toEqual(["EX9-007", "EX9-016", "EX9-061"]);
      expect(stack.slice(0, 3).every((card) => card.faceUp === false)).toBe(true);
      expect(stack.slice(3).map(({ cardId }) => cardId)).toEqual(["EX9-046", "EX9-050"]);
      expect(s.perm("source").topCard.cardId).toBe("EX9-053");
      expect(s.state.memory).toBe(-6);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
      expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-046", "BT1-048"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("does not process the effect when only two Ver.1 Digimon are available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "source" }],
          trash: ["EX9-007", "EX9-016", "EX9-023"],
          hand: ["EX9-053"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-050");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-007", "EX9-016", "EX9-023"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-053"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses inherited Blocker in live combat", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT2-063", as: "blocker", under: ["EX9-050"] }], security: ["BT1-001"] },
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

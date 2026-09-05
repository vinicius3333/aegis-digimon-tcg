import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX9-064.js";
import "../index.js";

describe("EX9-064", () => {
  it.each(["BT10-020", "EX9-038", "BT1-016"])(
    "enforces independent off-color Cyborg/DM evolution and resolves the real trigger for %s",
    async (base) => {
      const legal = base !== "BT1-016";
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "host", under: [{ card: "BT1-001", faceUp: false }] }],
            hand: [{ card: "EX9-064", as: "evo" }],
            trash: ["BT1-009"],
            deck: ["BT1-048"],
          },
          1: { battleArea: ["BT1-018", "EX9-009", "BT1-024"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
        }).ok,
      ).toBe(legal);
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-064" : base);
      expect(s.state.memory).toBe(legal ? 7 : 10);
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(
        legal ? ["BT1-009", "BT1-001", base] : ["BT1-001"],
      );
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
        legal ? ["BT1-024"] : ["BT1-018", "EX9-009", "BT1-024"],
      );
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(legal ? ["BT1-048"] : ["EX9-064"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("Q4824 lets Machinedramon prevent the inherited self-deletion after unsuspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-073",
              as: "host",
              under: [{ card: "BT1-001", faceUp: false }, { card: "BT1-002", faceUp: false }, "EX9-064"],
            },
          ],
        },
        1: { security: ["BT1-003", "BT1-004"] },
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
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").topCard.cardId).toBe("EX9-073");
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX9-064"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each(["BT1-024", "EX9-038"])(
    "pays independent Cyborg/Ver.4 card %s to reduce real play by exactly two",
    async (payment) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX9-064", as: "card" }, payment] },
          1: { battleArea: ["BT1-009", "BT1-016", "BT1-021"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.memory).toBe(5);
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => [card.cardId, card.faceUp])).toEqual([
        [payment, false],
      ]);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-021"]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-016"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("Q4823 pays its optional hand cost during effect-driven free play without charging memory", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-064", as: "card" }, "EX9-038"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    await advance(s.engine).verb.playInstances([s.inst("card").instanceId]);
    await settle();
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-064");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["EX9-038", false],
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines both real-play costs, preserving hand, trash and opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-064", as: "card" }, "EX9-038"], trash: ["BT1-009"] },
        1: { battleArea: ["BT1-016"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-038"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the inherited unsuspend only on the first real attack with another lowest-level target still available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-089", as: "host", under: ["EX9-064"] }, "BT1-009", "BT1-010"] },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT3-089", "BT1-010"]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT3-089", "BT1-010"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("reduces play cost by two by trashing Cyborg or Ver.4 and deletes two low-cost Digimon after placing a trash source", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [{ actions: [{ mode: "reduceCost", amount: 2, cost: { kind: "trash" } }] }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 2,
            filter: { playCostLte: 4, playCostLteScaling: { per: 1, unit: "selfFaceDownDigivolutionCards" } },
          },
          cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
        },
      ],
    });
  });
  it("inherits once-per-turn deletion of the lowest-level own Digimon by unsuspending itself", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { superlative: "lowestLevel" } }, cost: { kind: "unsuspend" } }],
    }));
  it("scales both play and digivolve deletion limits only from face-down sources", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 4,
              playCostLteScaling: { per: 1, unit: "selfFaceDownDigivolutionCards" },
            },
            count: 2,
          },
          cost: {
            target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"] }, count: 1, from: ["trash"] },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
        },
      ]);
  });
  it.each([
    ["OnPlay", EffectTiming.OnPlay],
    ["WhenDigivolving", EffectTiming.WhenDigivolving],
  ] as const)(
    "%s places a trash Digimon face-down and deletes two opposing Digimon through the scaled play-cost ceiling",
    async (_label, timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-064", as: "source", under: [{ card: "EX9-015", faceUp: false }] }],
            trash: ["EX9-010"],
          },
          1: { battleArea: ["BT1-009", "BT1-018", "BT1-021"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );

      await advance(s.engine).fireForPermanent(timing, s.perm("source"));
      await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-021"));

      expect(s.perm("source").stack).toHaveLength(2);
      expect(s.perm("source").stack[0]).toMatchObject({ cardId: "EX9-010", faceUp: false });
      expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-010")).toBe(false);
      expect(s.state.players[1]!.trash.filter((card) => ["BT1-009", "BT1-018"].includes(card.cardId))).toHaveLength(2);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-021")).toBe(true);
    },
  );
  it("unsuspends itself and deletes the lowest-level own Digimon at end of attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-073", as: "host", under: ["EX9-064"] }, "BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.state.players[1]!.battleArea[0]!.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended === false && s.state.players[0]!.battleArea.length === 1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
  });
});

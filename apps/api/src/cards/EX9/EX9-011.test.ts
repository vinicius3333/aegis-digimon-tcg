import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-011.js";
import "../index.js";

describe("EX9-011", () => {
  it("can pay the reducer during a free effect play without spending memory (Q4753)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-011", as: "metal" }, "BT1-021"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("metal").instanceId]);
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("EX9-011");
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-021", false],
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { base: "BT2-058", alternate: false, legal: true, cost: 4 },
    { base: "EX9-029", alternate: true, legal: true, cost: 3 },
    { base: "BT1-051", alternate: true, legal: false, cost: 0 },
  ])("checks independent evolution legality from $base", async ({ base, alternate, legal, cost }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "EX9-011", as: "metal" }],
          trash: ["BT1-009"],
          deck: ["BT1-046"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.state.memory).toBe(5 - cost);
    expect(s.perm("base").topCard.cardId).toBe(legal ? "EX9-011" : base);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-046"] : ["EX9-011"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(legal ? [] : ["BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["BT1-021", "EX9-007"])(
    "pays the independent %s reducer then deletes exactly 7000 total DP",
    async (payment) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX9-011", as: "metal" }, payment, "BT1-046"] },
          1: {
            battleArea: [
              { card: "BT1-019", as: "over", dp: 8000 },
              { card: "BT1-015", as: "four" },
              { card: "BT1-009", as: "three" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
      expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
        [payment, false],
      ]);
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-019"]);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-015"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("declines the reducer and On Play payment without consuming either candidate", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-011", as: "metal" }, "BT1-021"], trash: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-021"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the body on real evolution and grants two real security checks to a legal level-6 host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-015", as: "host" }],
          hand: [
            { card: "EX9-011", as: "metal" },
            { card: "ST1-10", as: "mega" },
          ],
          trash: ["BT1-012"],
          deck: ["BT1-046", "BT1-045"],
        },
        1: { battleArea: [{ card: "BT1-009" }], security: ["BT1-045", "BT1-046"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-012", false],
      ["BT1-015", true],
    ]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["ST1-10", "BT1-046"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046", "BT1-045"]);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-012", "BT1-015", "EX9-011"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter(({ kind }) => kind === "securityChecked")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces its play cost by trashing a Cyborg or Ver.1 card and places a trash Digimon underneath when deleting opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [{ mode: "reduceCost", amount: 2, cost: { kind: "trash" } }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { totalDpCap: 5000 },
      totalDpCapScaling: { unit: "selfFaceDownDigivolutionCards", amount: 2000 },
      cost: { kind: "place", destination: "digivolutionStack", faceDown: true },
    });
  });

  it("scales the deletion limit only from face-down digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-011",
              as: "source",
              under: [
                { card: "EX9-007", faceUp: true },
                { card: "EX9-009", faceUp: true },
              ],
            },
          ],
          trash: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("source").stack).toHaveLength(3);
    expect(s.perm("source").stack.some((card) => card.cardId === "BT1-009" && card.faceUp === false)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(true);
  });
});

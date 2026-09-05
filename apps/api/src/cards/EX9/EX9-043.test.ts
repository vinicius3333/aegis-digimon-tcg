import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-043.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-043", () => {
  it("rejects the alternate DM route from a level-3 base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-007", as: "base" }], hand: [{ card: "EX9-043", as: "metal" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("EX9-007");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-043"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("reduces play cost by trashing a Cyborg or Ver.5 card from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")).toMatchObject({
      actions: [{ kind: "ReducePlayCost", amount: { kind: "fixed", value: 2 }, payment: { kind: "trashFromHand" } }],
    }));
  it("places a trash Digimon underneath, de-digivolves, and deletes an opposing Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlaceUnder", faceDown: true, position: "bottom" },
          { kind: "DeDigivolve", amount: { kind: "countFaceDownDigivolutionCards" } },
          { kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } },
        ],
      });
  });
  it("has inherited Piercing", () =>
    expect(
      compiled.effects?.find((entry) => entry.actions.some((action) => action.kind === "GainKeyword")),
    ).toMatchObject({
      isInherited: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }],
    }));
  it("accepts Tyrannomon name or DM trait as separate alternate evolution routes", () =>
    expect(compiled.digivolutionRequirement).toEqual([
      { cost: 3, isAlternate: true, level: 4, names: ["Tyrannomon"] },
      { cost: 3, isAlternate: true, traits: ["DM"], level: 4 },
    ]));

  it.each(["BT1-021", "EX9-039"])(
    "trashes an independently eligible %s and reduces play cost by two",
    async (payment) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "EX9-043", as: "metal" },
              { card: payment, as: "payment" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const player = s.state.players[0] as PlayerState;
      const paymentId = s.inst("payment").instanceId;
      const before = s.state.memory;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId }).ok).toBe(true);
      await settle(() => player.battleArea.length > 0);
      await settle();
      expect(before - s.state.memory).toBe(5);
      expect(player.hand.find((card) => card.instanceId === paymentId)).toBeUndefined();
      expect(player.battleArea[0]!.stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([[payment, false]]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([true, false])("checks security after a battle win only with inherited Piercing: %s", async (inherited) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-080", as: "host", under: inherited ? ["EX9-043"] : [] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(inherited ? 0 : 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not reduce the cost or trash an ineligible hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-043", as: "metal" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const plainId = s.inst("plain").instanceId;
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId }).ok).toBe(true);
    await settle(() => player.battleArea.length > 0);
    expect(before - s.state.memory).toBe(7);
    expect(player.hand.find((card) => card.instanceId === plainId)).toBeDefined();
  });

  it("places a face-down trash card, de-digivolves once, and deletes a 3000 DP target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-043", as: "metal" }], trash: ["BT1-012"] },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId }).ok).toBe(true);
    await settle(() => opponent.battleArea.length === 0);
    await settle();
    const played = (s.state.players[0] as PlayerState).battleArea[0];
    expect(played).toBeDefined();
    expect(played!.stack.some((card) => card.cardId === "BT1-012" && !card.faceUp)).toBe(true);
    expect(opponent.battleArea).toHaveLength(0);
    expect(opponent.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-015", "BT1-009"]));
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["Tyrannomon name", "BT2-044"],
    ["DM trait", "EX9-039"],
  ])("digivolves through the %s alternate route", async (_route, base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "EX9-043", as: "metal" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(true);
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("EX9-043");
    expect(s.state.memory).toBe(2);
  });

  it("resolves the When Digivolving cleanup after a legal normal evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-039", as: "base" }],
          hand: [{ card: "EX9-043", as: "metal" }],
          trash: ["BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metal").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT1-012" && !card.faceUp)).toBe(true);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-012", "EX9-039"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-015", "BT1-009"]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])(
    "does not process the cleanup without placement payment; trash available: %s (Q4797)",
    async (hasTrash) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX9-043", as: "metal" }], trash: hasTrash ? ["BT1-012"] : [] },
          1: {
            battleArea: [
              { card: "BT1-015", as: "stack", under: ["BT1-009"] },
              { card: "BT1-009", as: "small" },
            ],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId }).ok).toBe(true);
      await settle();
      expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(hasTrash ? ["BT1-012"] : []);
      expect(s.perm("stack").topCard.cardId).toBe("BT1-015");
      expect(s.perm("stack").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
      expect(s.state.players[1]!.battleArea).toHaveLength(2);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});

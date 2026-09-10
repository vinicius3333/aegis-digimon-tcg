import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-006.js";

describe("EX8-006", () => {
  it("matches the catalog's Digi-Egg identity and inherited text", () =>
    expect(getCardDefinition("EX8-006")).toMatchObject({
      cardId: "EX8-006",
      nameEn: "DemiMeramon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Flame", "NSo"],
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] If this Digimon has the [NSo]\u00a0trait, by trashing 1 card in your hand, delete 1 of your opponent's level 3 Digimon.",
      evoCosts: [],
    }));

  it("inherits a once-per-turn optional attack effect that trashes a card to delete an opposing level 3 Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], levels: [3] } },
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["NSo"], match: "trait" }] },
          },
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    }));
  it("keeps the NSo gate on the live inherited effect", () => {
    const action = compiled.effects?.find((entry) => entry.isInherited)?.actions[0];
    expect(action).toMatchObject({
      condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["NSo"], match: "trait" }] } },
    });
  });

  it("trashes one card and deletes one opposing level 3 only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-009", as: "cost1" },
            { card: "BT1-010", as: "cost2" },
          ],
          battleArea: [{ card: "EX8-008", as: "host", under: ["EX8-006"], dp: 20_000 }],
        },
        1: {
          security: ["BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-009", as: "target1" },
            { card: "AD1-001", as: "target2" },
          ],
        },
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
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("AD1-001");
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("may refuse without paying the hand cost or deleting", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-009", as: "cost" }],
          battleArea: [{ card: "EX8-008", as: "host", under: ["EX8-006"] }],
        },
        1: { security: ["BT1-009"], battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it.each([
    ["BT1-010", "BT1-009", true],
    ["EX8-008", "AD1-001", true],
    ["EX8-008", "BT1-009", false],
  ] as const)(
    "requires an NSo host, an exact level 3 target, and a payable hand cost",
    async (host, target, hasCost) => {
      const s = setupEngine(
        {
          0: {
            hand: hasCost ? ["BT1-009"] : [],
            battleArea: [{ card: host, as: "host", under: ["EX8-006"], dp: 20_000 }],
          },
          1: { security: ["BT1-009"], battleArea: [{ card: target, as: "target" }] },
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
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
    },
  );

  it("resets its once-per-turn deletion on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-009", as: "cost1" },
            { card: "BT1-009", as: "cost2" },
            { card: "BT1-009", as: "cost3" },
          ],
          battleArea: [{ card: "EX8-008", as: "host", under: ["EX8-006"], dp: 20_000 }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-009", as: "target1" },
            { card: "BT1-009", as: "target2" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

import { CARD_ID_VIEW_TAG, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT26-004.js";
import "../index.js";

const CARD_ID = "BT26-004";

describe("BT26-004 Pagumon", () => {
  it("Q6954-Q6957 places the cost hidden at the bottom, draws, and reveals it only after trashing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", under: [CARD_ID] },
            {
              card: "BT25-088",
              as: "tamer",
              under: [{ card: "BT1-001", as: "existing", faceUp: false }],
            },
          ],
          hand: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const cost = s.inst("cost").instanceId;
    const existing = s.inst("existing").instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([cost, existing]);
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);

    expect(s.engine.makeStateView(0)!.hasTag(s.inst("cost"), CARD_ID_VIEW_TAG)).toBe(true);
    expect(s.engine.makeStateView(1)!.hasTag(s.inst("cost"), CARD_ID_VIEW_TAG)).toBe(false);

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("tamer").permanentId, [cost], 0);
    expect(s.state.players[0]!.trash.find((card) => card.instanceId === cost)).toMatchObject({
      cardId: "BT1-009",
      faceUp: true,
    });
    expect(s.engine.makeStateView(1)!.hasTag(s.inst("cost"), CARD_ID_VIEW_TAG)).toBe(true);
  });

  it("accepts an unqualified Tamer card from hand as the face-down placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-065", as: "attacker", under: [CARD_ID] },
            { card: "BT25-088", as: "tamer" },
          ],
          hand: [{ card: "BT1-089", as: "tamerCard" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === s.inst("tamerCard").instanceId));

    expect(s.perm("tamer").stack[0]).toMatchObject({
      instanceId: s.inst("tamerCard").instanceId,
      faceUp: false,
    });
  });

  it("places under a controller-owned Glowing Dawn Tamer and not an opponent or plain Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", under: [CARD_ID] },
            { card: "BT25-088", as: "first" },
            { card: "BT26-089", as: "second" },
            { card: "BT1-089", as: "plainTamer" },
          ],
          hand: [{ card: "BT1-009", as: "cost" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT25-088", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });

    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(1);
    expect(s.perm("plainTamer").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
  });

  it("resolves only once per turn after a successful cost payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", under: [CARD_ID] },
            { card: "BT25-088", as: "tamer" },
          ],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const trigger = { attackerPermanentId: s.perm("attacker").permanentId };
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), trigger);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), trigger);

    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("does not pay the hand-card cost or draw without an own Glowing Dawn Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", under: [CARD_ID] },
            { card: "BT1-089", as: "plainTamer" },
          ],
          hand: [{ card: "BT1-010", as: "cost" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });

    expect(s.perm("plainTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });

  it("may decline the optional placement condition without moving or drawing cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", under: [CARD_ID] },
            { card: "BT25-088", as: "tamer" },
          ],
          hand: [{ card: "BT1-010", as: "cost" }],
          deck: [{ card: "BT1-011", as: "notDrawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("attacker"), {
      attackerPermanentId: s.perm("attacker").permanentId,
    });

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });

  it("is compiled as a face-down placement cost under a Glowing Dawn Tamer", () => {
    const action = irNode(compiled.effects[0]!.actions[0]!);
    expect(compiled).toMatchObject({
      coverage: "full",
      effects: [{ trigger: "WhenAttacking", frequency: "OncePerTurn", isInherited: true }],
    });
    expect(action).toMatchObject({ optional: true, cost: { faceDown: true, underFilter: { kind: ["Tamer"] } } });
    expect(action.cost?.target?.filter?.kind).toBeUndefined();
  });
});

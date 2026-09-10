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
        1: { security: ["BT1-009"] },
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

  it("refuses the second public attack in one turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST2-11", as: "attacker", under: [CARD_ID] },
            { card: "BT25-088", as: "tamer" },
          ],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
            { card: "BT1-011", as: "thirdCost" },
          ],
          deck: [
            { card: "BT1-012", as: "firstDraw" },
            { card: "BT1-013", as: "secondDraw" },
            { card: "BT1-014", as: "thirdDraw" },
          ],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
    };

    await attack();
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("firstCost").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("firstDraw").instanceId);

    await attack();
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("firstCost").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("secondCost").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("secondDraw").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await attack();
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("secondCost").instanceId,
      s.inst("firstCost").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("thirdDraw").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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

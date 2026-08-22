import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-004.js";
import "../index.js";

const CARD_ID = "BT26-004";

describe("BT26-004 Pagumon", () => {
  it("pays the hand-card cost, puts it face down at the bottom under a Glowing Dawn Tamer, then draws", async () => {
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
  });

  it("places under a controller-owned Glowing Dawn Tamer and not an opponent or plain Tamer", async () => {
    const s = setupEngine({
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
    }, { autoAcceptOptional: true, autoSelectCards: true });
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

  it("is compiled as a face-down placement cost under a Glowing Dawn Tamer", () => {
    const action = compiled.effects[0]!.actions[0]! as any;
    expect(compiled).toMatchObject({
      coverage: "full",
      effects: [{ trigger: "WhenAttacking", frequency: "OncePerTurn", isInherited: true }],
    });
    expect(action.cost).toMatchObject({ faceDown: true, underFilter: { kind: ["Tamer"] } });
  });
});

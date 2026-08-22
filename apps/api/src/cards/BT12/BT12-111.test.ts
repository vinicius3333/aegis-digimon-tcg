import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-111.js";

describe("BT12-111 handwritten module", () => {
  it("registers its printed OnPlay effect without declarative effect record", () => {
    const module = getEffectModule("BT12-111");
    expect(module?.cardId).toBe("BT12-111");
    const source = {
      instanceId: "source-111",
      cardId: "BT12-111",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.OnUseAttack, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source).length).toBeGreaterThan(0);
  });

  it("deletes an opposing Digimon and places Bagra Army cards from trash underneath itself", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-111", as: "source" }],
        trash: [{ card: "BT12-111", as: "saved" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea[0]!.stack.length >= 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const stack = s.state.players[0]!.battleArea[0]!.stack;
    expect(s.state.players[0]!.battleArea[0]!.topCard!.instanceId).toBe(s.inst("source").instanceId);
    expect(stack).toHaveLength(1);
    expect(stack[0]!.instanceId).toBe(s.inst("saved").instanceId);
  });

  it("trashes exactly five sources and returns every Tamer after an opponent attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT12-111",
              as: "source",
              under: ["BT12-111", "BT12-111", "BT12-111", "BT12-111", "BT12-111", "BT12-111"],
            },
            { card: "BT12-092", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenOpponentAttacks", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.perm("source").stack.length === 1 && s.state.players[0]!.hand.length === 1);
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT12-092")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-063.js";

describe("EX8-063", () => {
  const source = { instanceId: "source", cardId: "EX8-063", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the once-per-turn opponent discard-or-Fallen Angel effect when digivolving and attacking", () => {
    const module = getEffectModule("EX8-063")!;
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]?.maxPerTurn).toBe(1);
    expect(module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]?.maxPerTurn).toBe(1);
  });
  it("registers the once-per-turn opponent-hand-trash security watcher", () => {
    const module = getEffectModule("EX8-063")!;
    expect(module.effectsForTiming(EffectTiming.None, source)[0]?.maxPerTurn).toBe(1);
  });
  it("trashes an opponent hand card on the digivolving branch", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-063", as: "source" }] }, 1: { hand: [{ card: "BT1-010", as: "opponentCard" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => opponent.hand.length === 0);
    expect(opponent.hand).toHaveLength(0);
    expect(opponent.trash.some((card) => card.instanceId === s.inst("opponentCard").instanceId)).toBe(true);
  });
  it("plays the exact eligible Fallen Angel from trash when the opponent has no hand card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-063", as: "source" }], trash: ["EX8-059", "BT1-010"] }, 1: { hand: [] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-059"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-059")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-059")).toBe(false);
  });
});

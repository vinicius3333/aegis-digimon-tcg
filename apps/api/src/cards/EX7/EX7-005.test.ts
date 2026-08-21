import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./EX7-005.js";
import "../index.js";

describe("EX7-005 Kapurimon", () => {
  it("registers an inherited once-per-turn Three Musketeers Option stack watcher", () => {
    const source = { instanceId: "source", cardId: "EX7-005", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const effect = getEffectModule("EX7-005")!.effectsForTiming(EffectTiming.None, source)[0]!;
    expect(effect.isInherited).toBe(true);
    expect(effect.maxPerTurn).toBe(1);
    expect(effect.description).toContain("Three Musketeers");
  });

  it("gains 1 memory only when the newly placed card is a Three Musketeers Option", async () => {
    const s = setupEngine({
      0: {
        hand: ["EX7-071", "BT1-009"],
        battleArea: [{ card: "BT1-009", dp: 4000, as: "host", under: ["EX7-005"] }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const option = s.state.players[0].hand.find((card) => card.cardId === "EX7-071")!;
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [option.instanceId]);
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);

    const nonOption = s.state.players[0].hand.find((card) => card.cardId === "BT1-009")!;
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [nonOption.instanceId]);
    await settle(() => s.state.players[0].battleArea[0]!.stack.some((card) => card.instanceId === nonOption.instanceId));
    expect(s.state.memory).toBe(4);
  });
});

import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-098.js";

describe("BT12-098 handwritten module", () => {
  it("registers its printed OnPlay effect without declarative effect record", () => {
    const module = getEffectModule("BT12-098");
    expect(module?.cardId).toBe("BT12-098");
    const source = {
      instanceId: "source-098",
      cardId: "BT12-098",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });

  it("reveals three cards and adds a Save Digimon and a Hunter card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-098", as: "watchmaker" }],
        deck: ["BT12-008", "BT12-087", "BT1-009"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("watchmaker"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-008", "BT12-087"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toContain("BT1-009");
  });
});

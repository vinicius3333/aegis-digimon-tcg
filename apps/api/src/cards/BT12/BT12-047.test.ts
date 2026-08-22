import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-047.js";

describe("BT12-047 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-047");
    expect(module?.cardId).toBe("BT12-047");
    const source = {
      instanceId: "source-047",
      cardId: "BT12-047",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
  });
});

it("adds both eligible cards from the reveal and bottoms the remainder", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-047", as: "wormmon" }],
        deck: ["BT17-077", "BT3-094", "BT1-009"],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT3-094"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT17-077", "BT3-094"]));
  expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
});

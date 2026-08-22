import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "./BT14-030.js";

describe("BT14-030", () => {
  const source = { instanceId: "source", cardId: "BT14-030", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the return-to-hand effects on play and digivolution", () => {
    expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });
  it("registers the once-per-turn recovery watcher", () => expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.None, source)[0]?.maxPerTurn).toBe(1));

  it("recovers when another Digimon returns to hand during your turn", async () => {
    const s = setup({
      0: {
        battleArea: [
          { card: "BT14-030", as: "marine" },
          { card: "BT1-009", as: "ownDigimon" },
        ],
        security: [{ card: "BT1-001" }],
        deck: [{ card: "BT1-002" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.turnSeat = 0;

    await advance(s.engine).verb.returnToHand([s.perm("ownDigimon").topCard!.instanceId]);
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});

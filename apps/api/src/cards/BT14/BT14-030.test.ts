import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT14-030.js";

describe("BT14-030", () => {
  const source = { instanceId: "source", cardId: "BT14-030", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the return-to-hand effects on play and digivolution", () => {
    expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });
  it("registers the once-per-turn recovery watcher", () => expect(getEffectModule("BT14-030")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1));

  it("recovers when another Digimon returns to hand during your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-030", as: "marine" }], security: ["BT1-001"], deck: ["BT1-002"] },
      1: { battleArea: [{ card: "BT14-020", as: "victim" }] },
    });
    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).verb.returnToHand([s.perm("victim").topCard.instanceId]);
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});

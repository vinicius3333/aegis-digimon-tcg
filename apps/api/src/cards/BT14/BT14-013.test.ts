import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT14-013.js";

describe("BT14-013", () => {
  const source = { instanceId: "source", cardId: "BT14-013", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers start-main digivolution cost reduction and inherited end-turn attack", () => {
    expect(getEffectModule("BT14-013")!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(getEffectModule("BT14-013")!.effectsForTiming(EffectTiming.OnEndTurn, source)[0]?.maxPerTurn).toBe(1);
  });

  it("uses the inherited end-of-turn attack on a qualifying Tyrannomon stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-013", as: "host", under: ["BT14-013"] }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

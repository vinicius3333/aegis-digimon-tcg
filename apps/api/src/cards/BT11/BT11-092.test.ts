import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-092.js";

describe("BT11-092 Analogman", () => {
  it("trashes a level 5 Cyborg to gain 1 memory and draw 1 at start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-092", as: "analogman" }],
          hand: [{ card: "AD1-003", as: "cyborg" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("analogman"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cyborg").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("arms an opponent-attack redirect watcher", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-092", as: "analogman" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("analogman").permanentId)).toHaveLength(1);
  });
});

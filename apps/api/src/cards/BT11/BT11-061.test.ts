import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-061.js";
import "./BT11-070.js";
import "./BT11-111.js";

describe("BT11-061 Vemmon", () => {
  it("reduces a matching inherited digivolution cost only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT11-065",
          as: "host",
          under: [{ card: "BT11-061", as: "vemmon" }],
        }],
        hand: [
          { card: "BT11-070", as: "destromon" },
          { card: "BT11-111", as: "galacticmon" },
        ],
      },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("destromon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT11-070");
    expect(s.state.memory).toBe(6); // printed 5, reduced to 4

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("galacticmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT11-111");
    expect(s.state.memory).toBe(0); // printed 6; the once-per-turn reduction was consumed
  });
});

import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-042.js";

describe("BT11-042 Angewomon", () => {
  it("searches all security, adds an Angel-family card, recovers and shuffles", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-039", as: "base" }],
        hand: [{ card: "BT11-042", as: "angewomon" }],
        security: [
          { card: "BT11-038", as: "angel" },
          { card: "BT1-001", as: "securityRest" },
        ],
        deck: [{ card: "BT1-001", as: "recovery" }, "BT1-001"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("angewomon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.length === 2 &&
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("angel").instanceId)
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("angel").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(s.inst("recovery").instanceId);
  });

  it("gains 1 memory when its controller plays LadyDevimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-042", as: "angewomon" }],
        hand: [{ card: "BT11-083", as: "ladyDevimon" }],
      },
    });
    s.state.memory = 10;
    const playCost = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyDevimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 10 - playCost + 1);

    expect(s.state.memory).toBe(4);
  });

  it("inherited effect grants Blocker to Angel-family Digimon on the opponent's turn while a purple Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-083", under: ["BT11-042"] },
          { card: "BT11-038", as: "angemon" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("angemon"), "Blocker")).toBe(true);
  });
});

import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-092.js";

describe("BT11-092 Analogman", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-092")).toMatchObject({ cardId: "BT11-092", colors: ["Black"], kinds: ["Tamer"], playCost: 4 });
    expect(compiled.effects).toMatchObject([
      { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1 }, { kind: "Draw", amount: 1 }] },
      { trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

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

  it("suspends to redirect an opponent's player attack to an allied level 6 Machine", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-092", as: "analogman" },
            { card: "BT15-066", as: "machine" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const machineId = s.perm("machine").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== machineId));

    expect(s.perm("analogman").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT15-066")).toBe(true);
  });
});

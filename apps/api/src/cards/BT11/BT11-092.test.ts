import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-092.js";
import "../index.js";

describe("BT11-092 Analogman", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-092")).toMatchObject({
      cardId: "BT11-092",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          { kind: "GainMemory", amount: 1 },
          { kind: "Draw", amount: 1 },
        ],
      },
      { trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("trashes a level 5 Cyborg to gain 1 memory and draw 1 at start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-092", as: "analogman" }, "BT1-009"],
          hand: [{ card: "AD1-003", as: "cyborg" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
          security: ["BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-015", "BT1-016"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cyborg").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
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
  // KB Q1976/Q1993: a [When Attacking] effect and an [Opponent's Turn] redirect trigger
  // simultaneously off one attack declaration, so the turn player's effect activates first.
  it("resolves the attacker's When Attacking before offering the redirect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-092", as: "analogman" },
            { card: "BT15-066", as: "machine" },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT13-021", as: "attacker", dp: 13000 }],
          hand: [{ card: "BT25-016", as: "grapLeomon" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("attacker").permanentId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grapLeomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());

    const triggered = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => `${String(event.sourceCardId)}:${String(event.timing)}`);
    const whenAttacking = triggered.indexOf("BT13-021:OnUseAttack");
    const redirect = triggered.indexOf("BT11-092:whenOpponentAttacks");
    expect(whenAttacking).toBeGreaterThanOrEqual(0);
    expect(redirect).toBeGreaterThanOrEqual(0);
    expect(whenAttacking).toBeLessThan(redirect);
    expect(s.perm("analogman").isSuspended).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-046.js";

describe("BT15-046", () => {
  it("registers the once-per-turn watcher for your Digimon suspending", async () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });
  it("registers the draw trigger in the typed YourTurn IR", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSuspended" }],
    }));

  it("draws once when another one of your Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-046", as: "woodmon" },
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-009", as: "secondAttacker" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: ["BT1-009", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1, 1_500);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([s.perm("secondAttacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("digivolves legally from a green level-3 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-065", as: "base" }],
        hand: [{ card: "BT15-046", as: "woodmon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("woodmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-046");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-065"]);
  });
});

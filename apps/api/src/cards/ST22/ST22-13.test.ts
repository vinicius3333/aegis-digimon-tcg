import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-13 GrandGalemon", () => {
  it("suspends an opposing Digimon and gains 3000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST22-13", as: "grand" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.perm("opponent");
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grand").instanceId })).toEqual({ ok: true });
    const grand = s.perm("grand");
    await settle(() => grand.currentDP === 10000);
    expect(grand.isSuspended || opponent.isSuspended).toBe(true);
    expect(grand.currentDP).toBe(10000);
  });

  it("resolves Vortex combat from the real end-of-turn timing window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST22-13", as: "grand" }], deck: ["BT1-002", "BT1-002"] },
        1: { battleArea: [{ card: "ST1-02", as: "target" }], deck: ["BT1-002", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("target").permanentId;
    const startingTurn = s.state.turnCount;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => s.state.turnCount > startingTurn && s.state.phase === "Main" && mainPhase.isOpen);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.attackerPermanentId === s.perm("grand").permanentId &&
          event.target?.kind === "permanent" &&
          event.target.permanentId === targetId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

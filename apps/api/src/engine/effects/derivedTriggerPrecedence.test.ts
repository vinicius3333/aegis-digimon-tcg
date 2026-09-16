import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import "../../cards/BT10/BT10-087.js";
import "../../cards/BT20/BT20-072.js";
import "../../cards/EX12/EX12-046.js";
import "../../cards/EX12/EX12-047.js";
import "../../cards/EX12/EX12-065.js";

// CR §15-4-5-2/3: a derived triggering effect activates before effects already pending
// activation, and a derived trigger belonging to the NON-turn player goes before the turn
// player's pending ones. BT10-087's [Security] effect plays the card itself, so the [On Play]
// it creates is derived and must resolve before the turn player's already-pending "[Your Turn]
// When your opponent's security stack is removed from" reaction (EX12-046).
describe("derived trigger precedence over security-removal reactions", () => {
  it("resolves a security-played card's [On Play] before the turn player's whenSecurityRemoved reaction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-047", as: "digivolveTarget" }],
          battleArea: [
            { card: "EX12-065", as: "attacker" },
            { card: "EX12-046", as: "watcher" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: [{ card: "BT10-087" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    const order = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => `${event.sourceCardId}/${event.timing}`);
    expect(order).toContain("BT10-087/OnPlay");
    expect(order).toContain("EX12-046/whenSecurityRemoved");
    expect(order.indexOf("BT10-087/OnPlay")).toBeLessThan(order.indexOf("EX12-046/whenSecurityRemoved"));
  });

  // The real match declared the attack from INSIDE an effect body (a granted ＜Execute＞ at the
  // end of turn), which parks the security removal in the deferred queue instead of folding it
  // into the security-check window.
  it("keeps that order when the attack is declared from inside an effect body (＜Execute＞)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-047", as: "digivolveTarget" }],
          battleArea: [
            { card: "BT20-072", as: "attacker" },
            { card: "EX12-046", as: "watcher" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: [{ card: "BT10-087" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle();
    void turn;
    const order = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => `${event.sourceCardId}/${event.timing}`);
    expect(order).toContain("BT10-087/OnPlay");
    expect(order).toContain("EX12-046/whenSecurityRemoved");
    expect(order.indexOf("BT10-087/OnPlay")).toBeLessThan(order.indexOf("EX12-046/whenSecurityRemoved"));
  });
});

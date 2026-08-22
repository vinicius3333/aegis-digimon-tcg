import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-029.js";

describe("BT13-029 MachGaogamon", () => {
  it("locks the attack target for the turn and unsuspends on opponent-hand additions", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", actions: [expect.objectContaining({ kind: "Restrict", restriction: "attackTargetChange", duration: "forTheTurn", condition: expect.objectContaining({ kind: "zoneCount", value: 8 }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand" })] });
  });

  it("restricts attack-target changes when the opponent has eight cards in hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-029", as: "mach" }] }, 1: { hand: Array.from({ length: 8 }, (_, index) => ({ card: "BT13-021", as: `hand-${index}` })), security: ["BT1-002"] } }, { autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("mach").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("mach"), "attackTargetChange"), 3000);
    expect(observe(s.engine).isRestricted(s.perm("mach"), "attackTargetChange")).toBe(true);
  });

  it("unsuspends its host when an effect adds a card to the opponent's hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", suspended: true, under: ["BT13-029"] }] } });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(s.perm("host").isSuspended).toBe(false);
  });
});

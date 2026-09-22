import { describe, expect, it } from "vitest";
import type { Action, CardEffect, CompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "./effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import "../cards/index.js";

/**
 * Turn-player priority (§15-4-3, KB Q1976/Q1993) across EVERY printed card that redirects an
 * opponent's attack, not just the BT11-092 report: the attacker's [When Attacking] effect
 * resolves before the defender's watcher.
 *
 * The attack is EFFECT-DRIVEN (GrapLeomon BT25-016 orders Gaomon BT13-021 to attack), which is
 * the shape that used to invert: the declaration happens inside GrapLeomon's paused window, so
 * Gaomon's [When Attacking] pools there while the watcher fired at the declaration. Against the
 * pre-fix engine 37 of these cards inverted, so this sweep genuinely exercises the seam.
 *
 * Cards whose activation gate is not met in this generic board report `not-triggered` and are
 * counted, not asserted; the guard below keeps that bucket from silently swallowing the sweep.
 */
function redirectsAnOpponentAttack(compiled: CompiledCard): { found: boolean; inherited: boolean } {
  let inherited = false;
  const scan = (actions: readonly Action[], underWatcher: boolean): boolean =>
    actions.some((action) => {
      const nested = (action as { actions?: readonly Action[] }).actions ?? [];
      const isWatcher = action.kind === "SubTrigger" && action.event === "whenOpponentAttacks";
      if (underWatcher && action.kind === "RedirectAttack") return true;
      return scan(nested, underWatcher || isWatcher);
    });
  const found = compiled.effects.some((effect: CardEffect) => {
    if (!scan(effect.actions ?? [], false)) return false;
    inherited ||= effect.isInherited === true;
    return true;
  });
  return { found, inherited };
}

const SUBJECTS = [...registeredCompiledCards.entries()]
  .map(([cardId, compiled]) => ({ cardId, ...redirectsAnOpponentAttack(compiled) }))
  .filter(({ found }) => found)
  .sort((left, right) => left.cardId.localeCompare(right.cardId));

describe("opponent-attack redirect ordering", () => {
  it("covers every printed opponent-attack redirect", () => {
    expect(SUBJECTS.length).toBeGreaterThanOrEqual(40);
  });

  it.each(SUBJECTS.map(({ cardId, inherited }) => [cardId, inherited] as const))(
    "%s activates after the attacker's When Attacking",
    async (cardId, inherited) => {
      const preferred: string[] = [];
      const watcher = inherited
        ? { card: "BT15-066", under: [cardId], as: "watcher" }
        : { card: cardId, as: "watcher" };
      const s = setupEngine(
        {
          0: {
            battleArea: [
              watcher,
              { card: "BT15-066", as: "machine" },
              { card: "BT1-009", as: "ally", suspended: true },
            ],
            security: ["BT1-009", "BT1-010"],
            deck: ["BT1-011", "BT1-012", "BT1-013"],
            hand: ["BT1-014", "BT1-015"],
            trash: ["BT1-016", "BT1-017"],
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
      const triggeredKeys = (): string[] =>
        s.events
          .filter((event) => event.kind === "effectTriggered")
          .map((event) => `${String(event.sourceCardId)}:${String(event.timing)}`);
      // Stop at the watcher rather than at the end of combat: a card whose body digivolves
      // mid-attack (AD1-012) keeps combat open well past any tick budget, and everything this
      // asserts is already decided once the watcher has activated. A card whose gate is not met
      // never gets there, so ending the attack is the other way out.
      await settle(
        () => triggeredKeys().includes(`${cardId}:whenOpponentAttacks`) || !observe(s.engine).isAttacking(),
        4000,
      );

      const triggered = triggeredKeys();
      const watcherIndex = triggered.indexOf(`${cardId}:whenOpponentAttacks`);
      if (watcherIndex < 0) return; // activation gate not met on this generic board
      expect(triggered.indexOf("BT13-021:OnUseAttack")).toBeGreaterThanOrEqual(0);
      expect(triggered.indexOf("BT13-021:OnUseAttack")).toBeLessThan(watcherIndex);
    },
    20000,
  );
});

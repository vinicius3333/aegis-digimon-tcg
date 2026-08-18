import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../engine/effects/CardSource.js";
import { allRegisteredModules } from "../engine/effects/registry.js";

/**
 * Smoke test: for every registered card module, effectsForTiming must not throw
 * for any EffectTiming value.
 *
 * What this catches:
 *   - IR modules whose compiled CardEffect[] references an undefined/invalid field
 *   - Hand-authored modules that crash during effect construction
 *   - Timing-switch branches with runtime errors (wrong array access, bad cast, etc.)
 *
 * What this does NOT catch:
 *   - Behavioral correctness (wrong filter, wrong target, wrong primitive called)
 *   - canTrigger / canActivate / resolve errors (those require a full EffectContext)
 */

const ALL_TIMINGS = Object.values(EffectTiming).filter(
  (v): v is EffectTiming => typeof v === "number",
);

function makeSource(cardId = "X-000"): CardSource {
  const definition: CardDefinition = {
    cardId,
    set: cardId.split("-")[0] ?? "X",
    nameEn: cardId,
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
  return {
    instanceId: "SMOKE#1",
    cardId,
    ownerSeat: 0 as Seat,
    definition,
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("smoke: effectsForTiming (all registered modules, all timings)", () => {
  it(
    "imports all card modules without collision",
    async () => {
      await expect(import("./index.js")).resolves.toBeDefined();
    },
    30_000,
  );

  it(
    "effectsForTiming does not throw for any card or timing",
    async () => {
      await import("./index.js");

      const failures: string[] = [];

      for (const [cardId, module] of allRegisteredModules()) {
        const source = makeSource(cardId);
        for (const timing of ALL_TIMINGS) {
          try {
            module.effectsForTiming(timing, source);
          } catch (err) {
            const label = EffectTiming[timing] ?? String(timing);
            failures.push(`${cardId} @ ${label}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      if (failures.length > 0) {
        // Report all failures at once rather than stopping at the first.
        expect.fail(
          `${failures.length} effectsForTiming failure(s):\n${failures.slice(0, 50).join("\n")}${
            failures.length > 50 ? `\n… and ${failures.length - 50} more` : ""
          }`,
        );
      }
    },
    60_000,
  );
});

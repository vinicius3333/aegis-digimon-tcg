import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT21-040.js";

/**
 * BT21-040's alternate digivolution is gated on EITHER printed alternative:
 * "your opponent has a level 6 or higher Digimon OR you have 3 or more [Hero] trait Tamers
 * with different names". Each branch is proven to open the path on its own, and a board that
 * satisfies neither is proven to keep it shut.
 */
const SHINEGREYMON = "BT13-018";
const OPPONENT_LV6 = "AD1-004"; // WarGreymon, level 6
const HERO_TAMERS = ["BT21-080", "BT21-082", "BT21-083"]; // three distinct [Hero] Tamer names
const EFFECT_KEY = `BT21-040/ir-${EffectTiming.OnDeclaration}-0`;

function board(opts: { opponentLv6?: boolean; heroTamers?: number }) {
  const tamers = HERO_TAMERS.slice(0, opts.heroTamers ?? 0).map((card) => ({ card }));
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT21-040", as: "agumon" }, ...tamers],
        hand: [{ card: SHINEGREYMON, as: "shine" }],
      },
      1: { battleArea: opts.opponentLv6 ? [{ card: OPPONENT_LV6 }] : [] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  return s;
}

async function digivolvesForFour(s: ReturnType<typeof board>): Promise<boolean> {
  const before = s.state.memory;
  const result = s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm("agumon").topCard.instanceId,
    effectKey: EFFECT_KEY,
  });
  if (!result.ok) return false;
  await settle(() => s.perm("agumon").topCard?.cardId === SHINEGREYMON, 2000);
  // The alternate path is the only one that reaches ShineGreymon from a level 3 for 4 memory.
  expect(before - s.state.memory).toBe(4);
  return s.perm("agumon").topCard?.cardId === SHINEGREYMON;
}

describe("BT21-040 Agumon", () => {
  it("opens the ShineGreymon path when the opponent has a level 6 Digimon", async () => {
    expect(await digivolvesForFour(board({ opponentLv6: true }))).toBe(true);
  });

  it("opens it on three distinct [Hero] Tamers alone, with no level 6 opposite", async () => {
    expect(await digivolvesForFour(board({ heroTamers: 3 }))).toBe(true);
  });

  it("keeps it shut when neither alternative holds", async () => {
    // FAILS-WHEN-REVERTED: flattening both alternatives into one filter made this board — two
    // Hero Tamers and no level 6 opposite — indistinguishable from the ones above.
    const s = board({ heroTamers: 2 });
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("agumon").topCard.instanceId,
      effectKey: EFFECT_KEY,
    });
    expect(result).toEqual({ ok: false, reason: "illegal-target" });
  });
});

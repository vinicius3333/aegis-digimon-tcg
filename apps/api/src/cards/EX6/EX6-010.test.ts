import { describe, it, expect } from "vitest";
import { CardKind, type CardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import "../index.js";

// A3 for EX6-010 (Durandamon) — Red Lv.6 Digimon (Legend-Arms).
//
// [Your Turn][Inherited] When this Digimon's top card is [RagnaLoardmon] and it is
// attacking, the [Security] effects on cards it checks don't activate.
// Implemented via disableSecurityEffect(perm, "any", UntilEachTurnEnd).
//
// Observable outcome tested here: after recompute(), a RagnaLoardmon permanent with
// Durandamon in its digivolution stack has `isSecurityEffectDisabled(...) === true`
// for any security card kind.
//
const DURANDAMON = "EX6-010";
const RAGNALOARDMON = "BT3-019"; // "RagnaLoardmon" — exact name match for guard
const FILLER = "BT1-009"; // Monodramon — not RagnaLoardmon

function ledger(engine: unknown): ContinuousEffectLedger {
  return (engine as { continuous: ContinuousEffectLedger }).continuous;
}

async function recompute(engine: unknown): Promise<void> {
  await (engine as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
}

/** A minimal CardDefinition stub with Option kind, enough for isSecurityEffectDisabled(). */
function fakeOptionDef(): CardDefinition {
  return {
    cardId: "TEST-OPTION",
    nameEn: "Test Option",
    kinds: [CardKind.Option],
    colors: [],
    types: [],
    playCost: 1,
    level: undefined,
    dp: undefined,
    digivolveRequirement: [],
  } as unknown as CardDefinition;
}

describe("EX6-010 [Inherited] RagnaLoardmon host disables security effects (recompute)", () => {
  it("records disabledSecurityEffect on a RagnaLoardmon host with Durandamon in stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: RAGNALOARDMON, dp: 12000, as: "host", under: [DURANDAMON] }] },
    });

    await recompute(s.engine);

    // The inherited static effect should have recorded a security-effect disable on the host.
    expect(ledger(s.engine).isSecurityEffectDisabled(s.perm("host").permanentId, fakeOptionDef())).toBe(true);
    // FAILS-WHEN-REVERTED: the `disableSecurityEffect` call is removed → no disable recorded → false.
  });

  it("does NOT disable security effects when top card is NOT RagnaLoardmon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: FILLER, dp: 8000, as: "host", under: [DURANDAMON] }] },
    });

    await recompute(s.engine);

    expect(ledger(s.engine).isSecurityEffectDisabled(s.perm("host").permanentId, fakeOptionDef())).toBe(false);
  });
});

// A3 for EX6-010's [Hand] [Main] clause: "By paying 3 cost and placing this card as the
// bottom digivolution card of 1 of your Digimon that's level 6 or has the [Legend-Arms]
// trait, delete 1 of your opponent's Digimon with as much or less DP as that Digimon."
//
describe("EX6-010 [Hand] [Main] pay 3, place as bottom digivolution card, delete opponent Digimon", () => {
  it("places itself under the eligible level-6 host and deletes a lower-DP opponent Digimon, paying 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", dp: 12000, as: "host" }], // WarGreymon, level 6
          hand: [{ card: "EX6-010", as: "durandamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim" }] }, // DP <= host's DP
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    const durandamon = s.inst("durandamon");
    const res = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: durandamon.instanceId,
      effectKey: "EX6-010/main-place-and-delete",
    });
    expect(res).toEqual({ ok: true });

    const host = s.perm("host");
    const victim = s.perm("victim");
    const p1 = s.state.players[1]!;
    await settle(() => !p1.battleArea.some((p) => p.permanentId === victim.permanentId), 600);

    expect(host.stack.some((c) => c.instanceId === durandamon.instanceId)).toBe(true);
    expect(s.state.memory).toBe(7); // paid 3 cost
    expect(p1.battleArea.some((p) => p.permanentId === victim.permanentId)).toBe(false);
  });

  it("cannot activate with no eligible placement target (no level-6/Legend-Arms Digimon in play)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "host" }], // level 3, NOT eligible
          hand: [{ card: "EX6-010", as: "durandamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    const durandamon = s.inst("durandamon");
    const res = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: durandamon.instanceId,
      effectKey: "EX6-010/main-place-and-delete",
    });
    expect(res.ok).toBe(false);
  });
});

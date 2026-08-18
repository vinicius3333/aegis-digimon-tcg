import { describe, it, expect, afterEach } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard, unregisterCard } from "../../engine/effects/registry.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import "../index.js";

// A3 for BT11-112 (Rina Shinomiya) — [On Play] "1 of your Digimon with [Veemon] or
// [Veedramon] in its name gains <Blocker> and <Evade>".
//
// Lane R5's dead-clause family (third variant): `hasNameCandidate()` in BT11-112.ts read
// `def.names`, which does not exist on the real `CardDefinition`
// (packages/shared/src/cards/types.ts exposes only `nameEn`), so `canActivate` always saw
// zero candidates and this [On Play] clause silently no-oped even with a legal
// [Veemon]-named Digimon on the board. Fixed by delegating to the shared
// `matchNameOrTrait` (interpreter.ts) with a substring match ("with [X] in its name" per
// Comprehensive Rules manual — NOT the bare-bracket exact-name form).
//
// FAILS-WHEN-REVERTED: with `hasNameCandidate` back to reading `def.names`, no candidate is
// ever found, so the Veemon permanent never receives the Blocker/Evade grants (test RED).
describe("BT11-112 [On Play] grant Blocker + Evade to a [Veemon]/[Veedramon] Digimon", () => {
  it("grants Blocker and Evade to the owner's Veemon-named Digimon", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT11-023", dp: 1000, as: "veemon" }], // nameEn "Veemon"
          hand: [{ card: "BT11-112", as: "card" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const veemon = s.perm("veemon");
    const card = s.inst("card");
    s.state.memory = 3; // exactly the printed play cost

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId }),
    ).toEqual({ ok: true });

    await settle(() => false, 60); // flush the on-play resolution

    const rejected = s.events.find((e) => e.kind === "actionRejected");
    expect(rejected).toBeUndefined();

    const ledger = (
      s.engine as unknown as { continuous: { hasKeyword(id: string, k: string): boolean } }
    ).continuous;
    expect(ledger.hasKeyword(veemon.permanentId, "Blocker")).toBe(true);
    expect(ledger.hasKeyword(veemon.permanentId, "Evade")).toBe(true);
  });
});

// A3 for BT11-112's [All Turns] clause: "When one of your Digimon with [Veedramon] in its
// name becomes suspended, by suspending this Tamer, that Digimon activates 1 of its [When
// Digivolving] effects." (KB Q2142/Q2143.)
//
// FAILS-WHEN-REVERTED: without this clause the [All Turns] timing (OnTappedAnyone) returns no
// effects for BT11-112, so suspending the Veedramon-named Digimon never re-fires its [When
// Digivolving] effect and this Tamer never suspends either.
//
// EX3-031 (a real, cataloged Veedramon-named Digimon) is overridden with a synthetic [When
// Digivolving] effect (gain 1 memory) so the assertion is a simple, self-contained memory
// delta rather than depending on EX3-031's own printed [When Digivolving] behavior.
const TARGET_CARD = "EX3-031"; // Veedramon — a real, cataloged Lv.4 Digimon

describe("BT11-112 [All Turns] Veedramon-named Digimon suspended -> reactivate its [When Digivolving]", () => {
  let fired = 0;
  const stub: EffectModule = {
    cardId: TARGET_CARD,
    effectsForTiming(timing, source) {
      if (timing !== EffectTiming.WhenDigivolving) return [];
      return [
        whenDigivolving({
          source,
          effectKey: `${TARGET_CARD}/test-reactivate-target`,
          description: "test: [When Digivolving] gain 1 memory",
          resolve: async (ctx) => {
            fired += 1;
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    },
  };
  let original: EffectModule | undefined;

  afterEach(() => {
    unregisterCard(TARGET_CARD);
    if (original !== undefined) registerCard(original);
    fired = 0;
  });

  it("suspends the Tamer and re-fires the suspended Veedramon's [When Digivolving] effect", async () => {
    original = unregisterCard(TARGET_CARD);
    registerCard(stub);

    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-112", dp: 0, as: "kouji" },
            { card: TARGET_CARD, dp: 3000, as: "veedramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kouji = s.perm("kouji");
    const veedramon = s.perm("veedramon");
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnTappedAnyone, { suspendedPermanentId: veedramon.permanentId });

    await settle(() => fired > 0, 400);

    // The Veedramon-named Digimon's [When Digivolving] effect re-fired (gain 1 memory).
    expect(fired).toBe(1);
    expect(s.state.memory).toBe(6);
    // The cost was paid: this Tamer is now suspended.
    expect(kouji.isSuspended).toBe(true);
  });

  it("does NOT reactivate when the suspended Digimon does not have [Veedramon] in its name", async () => {
    original = unregisterCard(TARGET_CARD);
    registerCard(stub);

    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT11-112", dp: 0, as: "kouji" },
            // BT3-073 (WereGarurumon) has no [Veedramon] in its name.
            { card: "BT3-073", dp: 6000, as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const kouji = s.perm("kouji");
    const other = s.perm("other");
    s.state.memory = 5;

    await (
      s.engine as unknown as {
        fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnTappedAnyone, { suspendedPermanentId: other.permanentId });

    await settle(() => false, 60);

    expect(fired).toBe(0);
    expect(s.state.memory).toBe(5);
    expect(kouji.isSuspended).toBe(false);
  });
});

describe("BT11-112 [Your Turn][Once Per Turn] blue Digimon unsuspend -> memory", () => {
  it("gains memory from the actual unsuspended-permanent trigger field", async () => {
    const s = setup({
      0: {
        battleArea: [
          { card: "BT11-112", as: "kouji" },
          { card: "BT11-023", as: "blue" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    s.perm("blue").isSuspended = true;

    await (s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }).fireTiming(EffectTiming.OnUnTappedAnyone, { unsuspendedPermanentId: s.perm("blue").permanentId });

    await settle(() => s.state.memory === 4, 200);
    expect(s.state.memory).toBe(4);
  });
});

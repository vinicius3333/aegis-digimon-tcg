import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX12-052 (Diarbbitmon / "Truskmore Advance", a DUAL card) — the Option side's
// [Main] ability: "1 of your Digimon may unsuspend. Then, suspend 2 of your opponent's
// Digimon. 2 of their Digimon or Tamers can't unsuspend until their turn ends."
//
// FAILS-WHEN-REVERTED: the module had no EffectTiming.OnUseOption branch at all — the
// entire Option-side [Main] ability was unported, despite the file's own header claiming
// full coverage. Only the Digimon-side clauses (When Digivolving / When Attacking /
// Piercing / Vortex) existed.
describe("EX12-052 Option side [Main] unsuspend own Digimon, suspend + lock 2 opponent Digimon", () => {
  it("unsuspends the chosen own Digimon, suspends an opponent Digimon, and locks it from unsuspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-004", dp: 12000, suspended: true, as: "own" },
            { card: "BT1-064", dp: 3000 }, // Green, satisfies the Option's color requirement
          ],
          hand: [{ card: "EX12-052", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const _p0 = s.state.players[0]!;

    const optionCard = s.inst("option");
    // `useAs: "option"` (CR §4-5-2 DUAL-card side declaration) is read by
    // GameEngine.handlePlayCard at runtime (engine/actions/playCard.ts's own
    // `PlayCardIntent`), but the shared `@aegis/shared` `Intent` union does not carry the
    // field yet — a pre-existing protocol-typing gap outside this card module's scope
    // (apps/api/src/engine/** and packages/shared/src/protocol/** are off-limits per this
    // task's concurrency constraints). Cast narrowly so the test drives the real runtime
    // path without widening the public Intent type.
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & {
      useAs?: "digimon" | "option";
    };
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: optionCard.instanceId,
      useAs: "option",
    } as PlayCardIntentWithUseAs);
    expect(res).toEqual({ ok: true });

    const own = s.perm("own");
    const victim = s.perm("victim");
    await settle(() => !own.isSuspended && victim.isSuspended, 600);
    await settle(() => false, 60); // flush the remaining lock-restriction step

    expect(own.isSuspended).toBe(false); // unsuspended by the effect
    expect(victim.isSuspended).toBe(true); // suspended by the effect

    // The victim is now locked from unsuspending.
    const continuous = (s.engine as unknown as { continuous: { hasRestriction(id: string, kind: string): boolean } })
      .continuous;
    expect(continuous.hasRestriction(victim.permanentId, "unsuspend")).toBe(true);
  });
});

// A3 for EX12-052's Digimon-side [Counter] window: the SAME "1 of your Digimon gets +3000
// DP... then it may battle 1 opponent Digimon" ability is also usable by the non-turn
// (defending) player during §11-3 Counter Timing, per the printed
// "[When Digivolving] [When Attacking] [Counter] [Once Per Turn]" combined tag.
//
// FAILS-WHEN-REVERTED: the module had no EffectTiming.OnCounterTiming branch — only the
// [When Digivolving]/[When Attacking] windows existed, so the defending player could never
// activate this ability during the Counter window (`counterWindowOpened`'s eligibleCounters
// never included it).
describe("EX12-052 [Counter] DP boost + battle is offered during the counter window", () => {
  it("is eligible as a [Counter] effect and resolves via respondCounter", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
        1: { battleArea: [{ card: "EX12-052", dp: 12000, as: "counterCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const counterCard = s.perm("counterCard");

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));

    const opened = s.events.find((e) => e.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counterWindowOpened not found");
    expect(opened.defendingSeat).toBe(1);
    const eligible = opened.eligibleCounters.find((c) => c.instanceId === counterCard.topCard!.instanceId);
    expect(eligible, "EX12-052's [Counter] effect must be eligible").toBeDefined();

    const activate = s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: eligible!.instanceId,
      effectKey: eligible!.effectKey,
    });
    expect(activate).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectActivated"));

    const activatedEvent = s.events.find((e) => e.kind === "effectActivated");
    if (activatedEvent?.kind !== "effectActivated") throw new Error("effectActivated not found");
    expect(activatedEvent.sourceCardId).toBe("EX12-052");
  });
});

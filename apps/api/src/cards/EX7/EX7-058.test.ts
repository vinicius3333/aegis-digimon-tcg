import { describe, it, expect } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * A3 — Q1f: EX7-058 (LadyDevimon (X Antibody)) [On Play] [When Digivolving] "1 of your
 * opponent's Digimon gains '[End of Attack] Delete this Digimon.' until the end of their turn."
 *
 * Same Q1f malformed-`GrantAuraToOpponents`-shape gap as BT6-102/BT15-068/ST15-16/BT12-105/
 * EX1-068/EX8-059/BT8-031 (see BT6-102's header for the full writeup) — with an important
 * DIFFERENCE from those, found while proving this one: `EffectTiming.OnEndAttack` (the window
 * `"[End of Attack]"` compiles to) never actually gets dispatched through a real
 * `applyIntent({type:"attack"})` in this engine today — confirmed independently with a plain,
 * UNCONDITIONAL native `[End of Attack]` card (BT12-016's "gain 2 memory" clause never fires
 * either). That is a separate, pre-existing engine gap, not something this fix can reach or
 * that this test can respectably prove around.
 *
 * What THIS test proves instead: before the fix, the malformed shape's raw fallback path
 * (`SUBTRIGGER_EVENT_MAP[undefined] ?? "whenSuspended"`) installed a bogus watcher on the
 * "whenSuspended" bus — which DOES fire routinely (every attack suspends its own attacker) —
 * with `action.actions === undefined`, so the very next time the recipient attacked (suspending
 * itself), the watcher's `run` callback threw `TypeError: action.actions is not iterable` —
 * caught by `GameEngine`'s combat-error boundary (logged as "combat resolve failed" and surfaced
 * to the client as an `actionRejected` event rather than an unhandled rejection), but the attack
 * resolution itself aborts mid-way. The fix removes that crash: the malformed shape now installs
 * nothing reactive at all (routed to the currently-inert `grantCustomEffect`/`EffectTiming
 * .OnEndAttack` path instead), so the SAME attack completes cleanly to `{ ok: true }`.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch reinstates the bogus
 * "whenSuspended" watcher; confirmed directly (not merely inferred) — reverting and removing
 * this test's install-check assertion reproduces the exact "combat resolve failed: TypeError:
 * action.actions is not iterable" log on the recipient's own attack.
 */

describe('A3 EX7-058 — granted "[End of Attack] Delete this Digimon." (malformed-shape crash)', () => {
  it("POSITIVE: the granted recipient's own attack (which suspends it) completes without throwing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-058", as: "ladyDevimon" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const ladyDevimon = s.inst("ladyDevimon");
    const engine = s.engine as unknown as {
      applyIntent: typeof s.engine.applyIntent;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;
    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: ladyDevimon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);
    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g) =>
          g.instanceId === attacker.topCard!.instanceId &&
          g.token === "[End of Attack] Delete this Digimon.",
      ),
    ).toBe(true);

    // Hand the turn to seat 1 for its own attack: the play above spent memory, which ends
    // seat 0's Main phase, so the phase and the gauge are re-armed here too.
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    // Attacking suspends the attacker — this used to fire the malformed shape's bogus
    // "whenSuspended" fallback watcher and throw. It must now complete cleanly.
    const attackRes = engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => attacker.isSuspended, 1000);
    expect(attacker.isSuspended).toBe(true);
  });

  it("NEGATIVE: a Digimon that never received the grant also attacks (and suspends) without incident", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-058", as: "ladyDevimon" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "bystander" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as {
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    s.state.turnSeat = 1;
    const attackRes = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: bystander.permanentId,
      target: { kind: "player" },
    });
    expect(attackRes).toEqual({ ok: true });

    await settle(() => bystander.isSuspended, 1000);
    expect(bystander.isSuspended).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * A3 — Q1f: ST15-16 Trident Arm [Main] "＜De-Digivolve 3＞ 1 of your
 * opponent's Digimon. Then, until the end of your opponent's turn, 1 of your opponent's
 * Digimon gains '[Start of Your Main Phase] This Digimon attacks.'"
 *
 * Same Q1f malformed-`GrantAuraToOpponents`-shape gap as BT6-102/BT15-068: the corpus carried
 * only `target`+`effectText` (no `event`/`actions`), which threw once the granted watcher's
 * event actually fired. This card proves the SHARED "[Start of Your Main Phase] This Digimon
 * attacks." library entry — reused by BT16-058/BT18-099/EX6-042/ST15-16/BT23-032/P-183 — reaches
 * the discrete `EffectTiming.OnStartMainPhase` window (not a SubTrigger install) and forces the
 * granted opponent Digimon to attack on ITS OWN controller's next main phase.
 *
 * FAILS-WHEN-REVERTED: reverting the interpreter's routing branch or the library entry makes
 * the grant install with no effect (or throw, per Q1f's earlier confirmed-throws finding), so
 * firing OnStartMainPhase on the grantee's turn never forces an attack.
 */

describe('A3 ST15-16 — granted "[Start of Your Main Phase] This Digimon attacks."', () => {
  it("POSITIVE: the granted opponent Digimon is forced to attack on its own controller's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-16", as: "angoramon" }],
          // A Black source satisfies ST15-16's own printed color requirement.
          battleArea: [
            { card: "AD1-004", dp: 2000, as: "colorSource" },
            // ForceAttack targets a Digimon in this engine seam; keep it suspended so
            // the block window cannot introduce a pending decision in this proof.
            { card: "BT1-009", dp: 3000, as: "defender", suspended: true },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "ST15-12",
              dp: 11000,
              as: "recipient",
              under: ["BT1-009", "ST15-08", "ST15-11"],
            },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const angoramon = s.inst("angoramon");
    const recipient = s.perm("recipient");
    const engine = s.engine as unknown as {
      applyIntent: typeof s.engine.applyIntent;
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    s.state.turnSeat = 0;

    const playRes = engine.applyIntent(0, { type: "playCard", instanceId: angoramon.instanceId });
    expect(playRes).toEqual({ ok: true });

    await settle(() => engine.continuous.listCustomEffectGrants().length > 0, 3000);

    const grants = engine.continuous.listCustomEffectGrants();
    expect(
      grants.some(
        (g) =>
          g.instanceId === recipient.topCard!.instanceId &&
          g.token === "[Start of Your Main Phase] This Digimon attacks.",
      ),
    ).toBe(true);
    expect(recipient.topCard.cardId).toBe("BT1-009");
    expect(recipient.stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST15-12", "ST15-11", "ST15-08"]),
    );

    const securityBefore = p0.security.length;

    // The grant fires on the GRANTEE's (opponent's, seat 1) own main phase.
    s.state.turnSeat = 1;
    void engine.fireTiming(EffectTiming.OnStartMainPhase, {});

    await settle(() => recipient.isSuspended, 2000);

    // Forced attack: the granted Digimon suspended (attacking taps it) and the attack
    // resolved against the suspended defender controlled by the original caster.
    expect(recipient.isSuspended).toBe(true);
    expect(p0.security.length).toBe(securityBefore);
  });

  it("Security De-Digivolves 3 and stops at level 3 without granting an attack effect", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST15-16", as: "tridentArm", faceUp: true }] },
        1: {
          battleArea: [
            {
              card: "ST15-12",
              as: "target",
              under: ["BT1-009", "ST15-08", "ST15-11"],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const target = s.perm("target");
    const engine = s.engine as unknown as {
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tridentArm"));

    expect(target.topCard.cardId).toBe("BT1-009");
    expect(target.stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["ST15-12", "ST15-11", "ST15-08"]),
    );
    expect(engine.continuous.listCustomEffectGrants()).toHaveLength(0);
  });

  it("NEGATIVE: a Digimon that never received the grant does not attack on its controller's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-16", as: "angoramon" }],
          battleArea: [{ card: "AD1-004", dp: 2000, as: "colorSource" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "bystander" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const bystander = s.perm("bystander");
    const engine = s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    // Never play ST15-16 — no grant is ever installed on anyone.
    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    const securityBefore = p0.security.length;

    s.state.turnSeat = 1;
    await engine.fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => false, 200);

    expect(bystander.isSuspended).toBe(false);
    expect(p0.security.length).toBe(securityBefore);
  });
});

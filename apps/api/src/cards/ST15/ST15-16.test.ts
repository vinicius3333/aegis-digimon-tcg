import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe('A3 ST15-16 — granted "[Start of Your Main Phase] This Digimon attacks."', () => {
  it("POSITIVE: the granted opponent Digimon is forced to attack on its own controller's main phase", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-16", as: "angoramon" }],
          battleArea: [
            { card: "AD1-004", dp: 2000, as: "colorSource" },
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
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const p0 = s.state.players[0]!;
    const angoramon = s.inst("angoramon");
    const recipient = s.perm("recipient");
    preferInstanceIds.push(s.perm("defender").permanentId);
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

    s.state.turnSeat = 1;
    void engine.fireTiming(EffectTiming.OnStartMainPhase, {});

    await settle(() => recipient.isSuspended, 2000);

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

    expect(engine.continuous.listCustomEffectGrants().length).toBe(0);

    const securityBefore = p0.security.length;

    s.state.turnSeat = 1;
    await engine.fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => false, 200);

    expect(bystander.isSuspended).toBe(false);
    expect(p0.security.length).toBe(securityBefore);
  });
});

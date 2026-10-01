import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

describe("ST15-16 Trident Arm — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];
  const FORCED_ATTACK = "[Start of Your Main Phase] This Digimon attacks.";

  function hasForcedAttackGrant(s: ReturnType<typeof setupEngine>, alias: string): boolean {
    return observe(s.engine)
      .customEffectGrants(s.perm(alias))
      .some((grant) => grant.token === FORCED_ATTACK);
  }

  async function playTridentArm(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
    const instanceId = s.inst(alias).instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === instanceId));
  }

  function attacksDeclaredBy(s: ReturnType<typeof setupEngine>, seat: 0 | 1): number {
    return s.events.filter((event) => event.kind === "attackDeclared" && event.seat === seat).length;
  }

  it("can target a Digimon that can't attack, but no attack is made (Q818)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-16", as: "tridentArm" }],
          battleArea: [{ card: "BT2-052", as: "blackSource" }],
          deck: [...FILLER],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT2-058", as: "cantAttack" }],
          deck: [...FILLER],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await playTridentArm(s, "tridentArm");
    expect(hasForcedAttackGrant(s, "cantAttack")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settleAcrossTimers(() => attacksDeclaredBy(s, 1) > 0, 50);

    expect(hasForcedAttackGrant(s, "cantAttack")).toBe(true);
    expect(attacksDeclaredBy(s, 1)).toBe(0);
    expect(s.perm("cantAttack").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("with the effect on 2 Digimon, only the one whose effect activates first attacks (Q819)", async () => {
    type Recipient = "firstRecipient" | "secondRecipient";

    async function attackersWhenOpponentResolvesFirst(chosen: Recipient): Promise<string[]> {
      const preferInstanceIds: string[] = [];
      const preferTriggerKeys: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "ST15-16", as: "firstTridentArm" },
              { card: "ST15-16", as: "secondTridentArm" },
            ],
            battleArea: [{ card: "BT2-052", as: "blackSource" }],
            deck: [...FILLER],
            security: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [
              { card: "BT1-020", as: "firstRecipient" },
              { card: "BT1-020", as: "secondRecipient" },
            ],
            deck: [...FILLER],
            security: ["BT1-009", "BT1-009", "BT1-009"],
          },
        },
        { autoSelectCards: true, preferInstanceIds, preferTriggerKeys },
      );
      const recipients: Recipient[] = ["firstRecipient", "secondRecipient"];
      s.state.memory = 12;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("firstRecipient").topCard.instanceId);
      await playTridentArm(s, "firstTridentArm");
      preferInstanceIds.splice(0, preferInstanceIds.length, s.perm("secondRecipient").topCard.instanceId);
      await playTridentArm(s, "secondTridentArm");
      expect(hasForcedAttackGrant(s, "firstRecipient")).toBe(true);
      expect(hasForcedAttackGrant(s, "secondRecipient")).toBe(true);
      preferTriggerKeys.push(s.perm(chosen).topCard.instanceId);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      await settleAcrossTimers(() => !observe(s.engine).isAttacking() && attacksDeclaredBy(s, 1) > 0);
      await settleAcrossTimers(() => attacksDeclaredBy(s, 1) > 1, 50);

      const orderPrompt = s.decisions.find(({ seat, req }) => seat === 1 && req.kind === "orderTriggers");
      const offeredKeys = orderPrompt?.req.options?.triggerKeys ?? [];
      for (const recipient of recipients) {
        expect(offeredKeys.some((key) => key.includes(s.perm(recipient).topCard.instanceId))).toBe(true);
      }
      expect(s.state.players[0]!.security).toHaveLength(2);
      const attackerIds = s.events.flatMap((event) =>
        event.kind === "attackDeclared" && event.seat === 1 ? [event.attackerPermanentId] : [],
      );
      const attackers = attackerIds.map(
        (permanentId) => recipients.find((recipient) => s.perm(recipient).permanentId === permanentId) ?? permanentId,
      );
      expect(recipients.filter((recipient) => s.perm(recipient).isSuspended)).toEqual(attackers);

      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      return attackers;
    }

    expect(await attackersWhenOpponentResolvesFirst("secondRecipient")).toEqual(["secondRecipient"]);
    expect(await attackersWhenOpponentResolvesFirst("firstRecipient")).toEqual(["firstRecipient"]);
  });

  it("can target a Digimon immune to its opponent's effects on that turn, and it attacks once the immunity ends (Q820)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-16", as: "tridentArm" }],
          battleArea: [{ card: "BT2-052", as: "blackSource" }],
          deck: [...FILLER],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "immune", under: ["BT1-009"] }],
          deck: [...FILLER],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.restrict(s.perm("immune").permanentId, "beAffected", EffectDuration.UntilEachTurnEnd, {
      byOpponentEffectsOnly: true,
    });
    expect(observe(s.engine).hasRestriction(s.perm("immune"), "beAffected")).toBe(true);

    await playTridentArm(s, "tridentArm");
    expect(s.perm("immune").topCard.cardId).toBe("BT1-020");
    expect(hasForcedAttackGrant(s, "immune")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && attacksDeclaredBy(s, 1) > 0);

    expect(observe(s.engine).hasRestriction(s.perm("immune"), "beAffected")).toBe(false);
    expect(attacksDeclaredBy(s, 1)).toBe(1);
    expect(s.perm("immune").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

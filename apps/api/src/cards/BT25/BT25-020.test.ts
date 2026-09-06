import { describe, expect, it, vi } from "vitest";
import { CardColor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-020.js";
import "../index.js";

describe("BT25-020 Marsmon", () => {
  it("installs the hand-resident 13000 DP play-cost reduction", () => {
    const module = getEffectModule("BT25-020");
    expect(module?.effectsForTiming(EffectTiming.None, { cardId: "BT25-020" } as never)).toHaveLength(2);
  });

  it("installs a once-per-turn battle-won watcher for own TS Digimon", () => {
    const module = getEffectModule("BT25-020");
    const subscribeSubTrigger = vi.fn<EffectContext["fx"]["subscribeSubTrigger"]>();
    const source = {
      cardId: "BT25-020",
      instanceId: "marsmon-1",
      ownerSeat: 0,
      definition: { cardId: "BT25-020", colors: [CardColor.Red], kinds: ["Digimon"] },
      permanent: () => ({
        permanentId: "marsmon-p",
        topCard: { instanceId: "marsmon-i", cardId: "BT25-020" },
        stack: [],
        linked: [],
      }),
    } as never;
    const effects = module?.effectsForTiming(EffectTiming.None, source) ?? [];
    expect(effects).toHaveLength(2);
    const ctx = {
      source,
      fx: { subscribeSubTrigger },
    } as never;
    return effects[1]!.resolve(ctx).then(() => {
      expect(subscribeSubTrigger).toHaveBeenCalledWith(
        expect.objectContaining({ event: "whenBattleWon", once: false }),
      );
    });
  });

  it("reduces its play cost by 5 when either player has a 13000+ DP Digimon", async () => {
    const opponentQualified = setupEngine({
      0: { hand: [{ card: "BT25-020", as: "marsmon" }] },
      1: { battleArea: [{ card: "BT1-013", as: "threshold", dp: 13000 }] },
    });
    opponentQualified.state.memory = 7;
    expect(
      opponentQualified.engine.applyIntent(0, {
        type: "playCard",
        instanceId: opponentQualified.inst("marsmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponentQualified.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-020"));
    expect(opponentQualified.state.memory).toBe(0);

    const ownQualified = setupEngine({
      0: {
        hand: [{ card: "BT25-020", as: "marsmon" }],
        battleArea: [{ card: "BT1-013", as: "threshold", dp: 13000 }],
      },
    });
    ownQualified.state.memory = 7;
    expect(
      ownQualified.engine.applyIntent(0, {
        type: "playCard",
        instanceId: ownQualified.inst("marsmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ownQualified.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-020"));
    expect(ownQualified.state.memory).toBe(0);

    const belowThreshold = setupEngine({
      0: { hand: [{ card: "BT25-020", as: "marsmon" }] },
      1: { battleArea: [{ card: "BT1-013", as: "threshold", dp: 12999 }] },
    });
    belowThreshold.state.memory = 12;
    expect(
      belowThreshold.engine.applyIntent(0, {
        type: "playCard",
        instanceId: belowThreshold.inst("marsmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => belowThreshold.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-020"));
    expect(belowThreshold.state.memory).toBe(0);
  });

  it("does not count a 13000-DP Tamer or breeding Digimon for the play discount", async () => {
    for (const board of [
      { battleArea: [{ card: "BT1-086", as: "tamer", dp: 13000 }] },
      { breeding: { card: "BT1-013", as: "breeding", dp: 13000 } },
    ]) {
      const s = setupEngine({ 0: { hand: [{ card: "BT25-020", as: "marsmon" }], ...board } });
      s.state.memory = 12;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marsmon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-020"));
      expect(s.state.memory).toBe(0);
    }
  });

  it("gives one own Digimon +3000 DP, then may conduct a direct battle", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-020", as: "marsmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marsmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("marsmon").currentDP).toBe(15000);
    // The direct battle itself does not check security; Marsmon's All Turns
    // watcher then trashes the opponent's top security after winning.
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("Q6280: a Piercing public attack performs only one security check across direct and ordinary battles", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-020", as: "marsmon", linked: [{ card: "BT25-100", as: "piercingLink" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "directVictim", dp: 3000 },
            { card: "BT1-009", as: "attackVictim", dp: 3000, suspended: true },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("marsmon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attackVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("directVictim").instanceId, s.inst("attackVictim").instanceId]),
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Q6281 regression: an ordinary battle loser protected from deletion still permits Piercing from the earlier direct battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-020", as: "marsmon", linked: [{ card: "BT25-100", as: "piercingLink" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "directVictim", dp: 3000 },
            { card: "BT13-041", as: "protectedVictim", dp: 16000, suspended: true },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("marsmon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("protectedVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondBarrier",
        permanentId: s.perm("protectedVictim").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(
      s.inst("protectedVictim").instanceId,
    );
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not perform Piercing outside an attack during Marsmon's direct effect battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-020", as: "marsmon", linked: [{ card: "BT25-100", as: "piercingLink" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }], security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("marsmon"))).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("marsmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2); // Marsmon's separate battle-won trash only.
  });

  it("keeps the DP boost when the optional battle is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-020", as: "marsmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marsmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-020"));
    expect(s.perm("marsmon").currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("applies the entry boost and direct battle after a public TS evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-073", as: "base" }], hand: [{ card: "BT25-020", as: "marsmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("marsmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").topCard?.cardId).toBe("BT25-020");
    expect(s.perm("base").currentDP).toBe(15000);
  });

  it("boosts one own Digimon and battles a different own-selected attacker", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-020", as: "marsmon" }],
          battleArea: [
            { card: "BT1-009", as: "boost", dp: 2000 },
            { card: "BT1-009", as: "attacker", dp: 6000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marsmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const boostDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: boostDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("boost").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const attackDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("boost").currentDP).toBe(5000);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(6000);
    expect(s.perm("marsmon").currentDP).toBe(12000);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnUseAttack])(
    "%s resolves the shared boost-then-battle sequence",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT25-020", as: "marsmon" }] },
          1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await advance(s.engine).fire(timing, s.perm("marsmon"));
      await settle(() => s.state.players[1]!.battleArea.length === 0);
      expect(s.perm("marsmon").currentDP).toBe(15000);
    },
  );

  it("trashes the opponent's top security once per turn when any own TS Digimon wins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-020", as: "marsmon" },
            { card: "BT25-073", as: "otherTs" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victimOne", dp: 3000, suspended: true },
            { card: "BT1-009", as: "victimTwo", dp: 3000, suspended: true },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victimOne").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherTs").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victimTwo").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("orders Marsmon's security trash before a simultaneous On Deletion Recovery 1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-020", as: "marsmon" }] },
        1: {
          battleArea: [{ card: "BT2-034", as: "recoveryVictim", dp: 2000, suspended: true }],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("recoveryVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-003", "BT1-002"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("does not consume the TS battle-win security budget for a non-TS winner", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "nonTsAttacker", dp: 6000 },
            { card: "BT25-020", as: "marsmon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstVictim", dp: 3000, suspended: true },
            { card: "BT1-009", as: "secondVictim", dp: 3000, suspended: true },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nonTsAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("expires the On Play +3000 DP boost at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-020", as: "marsmon" }],
          deck: Array.from({ length: 5 }, () => "BT1-001"),
          security: ["BT1-002"],
        },
        1: { deck: Array.from({ length: 5 }, () => "BT1-002"), security: ["BT1-003"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marsmon").instanceId })).toEqual({
      ok: true,
    });
    let observedPeakDp = 0;
    await settle(() => {
      const marsmon = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT25-020");
      observedPeakDp = marsmon?.currentDP ?? observedPeakDp;
      return observedPeakDp === 15000;
    });
    expect(observedPeakDp).toBe(15000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("marsmon").currentDP).toBe(12000);
  });

  it("can battle an effect-immune Digimon because battle is a rule interaction", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-020", as: "marsmon" }] },
        1: { battleArea: [{ card: "BT19-101", as: "immune", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marsmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT19-101");
  });

  it("triggers the TS battle-won security trash after winning a security battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-020", as: "marsmon" }] },
        1: { security: ["BT1-009", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-001"]),
    );
  });

  it("triggers battle-won security trash even when Barrier prevents the loser's deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-020", as: "marsmon" }] },
        1: {
          battleArea: [{ card: "BT13-041", as: "barrier", dp: 3000, suspended: true }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marsmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("barrier").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(1, { type: "respondBarrier", permanentId: s.perm("barrier").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT13-041")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
  });

  it("uses the exact TS level-5 evolution requirement and rejects a near-match", async () => {
    expect(getCardDefinition("BT25-020")).toMatchObject({
      cardId: "BT25-020",
      nameEn: "Marsmon",
      colors: ["Red", "Green"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
    });
    expect(digivolutionRequirementsFor("BT25-020")).toContainEqual({
      level: 5,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: { battleArea: [{ card: "BT25-073", as: "base" }], hand: [{ card: "BT25-020", as: "marsmon" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("marsmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard?.cardId === "BT25-020");
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "wrongTraitBase", dp: 5000 }],
        hand: [{ card: "BT25-020", as: "marsmon" }],
      },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("wrongTraitBase").permanentId,
        instanceId: invalid.inst("marsmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

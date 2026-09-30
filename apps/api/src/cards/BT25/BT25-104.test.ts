import { describe, expect, it } from "vitest";
import { CardKind, EffectDuration, EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT25-104.js";
import "../index.js";

interface ActivatableEntry {
  instanceId: string;
  effectKey: string;
}

function activatableEffects(
  s: ReturnType<typeof setupEngine>,
  permanent: { activatableEffectsJson?: string },
): ActivatableEntry[] {
  (s.engine as unknown as { projection: { syncActivatableEffects(): void } }).projection.syncActivatableEffects();
  return permanent.activatableEffectsJson ? (JSON.parse(permanent.activatableEffectsJson) as ActivatableEntry[]) : [];
}

describe("BT25-104 ShineGreymon: Burst Mode", () => {
  it("exposes both the DATA SQUAD and Marcus-return Burst Digivolve routes", async () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { cost: 5, isAlternate: true, level: 6, traits: ["DATA SQUAD"] },
      {
        cost: 0,
        isAlternate: true,
        names: ["ShineGreymon"],
        burstDigivolve: { returnTamerNamesExact: ["Marcus Damon"] },
      },
    ]);
    expect(digivolutionRequirementsFor("BT25-104")).toEqual([
      { cost: 5, isAlternate: true, level: 6, traits: ["DATA SQUAD"] },
      {
        cost: 0,
        isAlternate: true,
        names: ["ShineGreymon"],
        burstDigivolve: { returnTamerNamesExact: ["Marcus Damon"] },
      },
    ]);

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-016", as: "base" },
            { card: "BT13-095", as: "marcus" },
          ],
          hand: [{ card: "BT25-104", as: "burst" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 20000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const priorTop = s.perm("base").topCard.instanceId;
    const marcusId = s.perm("marcus").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-104" && s.perm("target").currentDP === 2000);
    const burstInstance = s.perm("base").topCard.instanceId;
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === marcusId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marcusId)).toBe(true);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(true);

    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === burstInstance)).toBe(true);
    expect(s.perm("base").topCard.instanceId).toBe(priorTop);
  });

  it("uses its DATA SQUAD Use Requirement and resolves the Option side Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-104", as: "option" }],
          battleArea: [{ card: "BT25-021", as: "dataSquad" }],
        },
        1: { battleArea: [{ card: "AD1-001", dp: 20000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;

    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as PlayCardIntentWithUseAs),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000));

    expect(s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000)).toBe(true);
  });

  it("reduces exactly one opposing Digimon and ignores opposing Tamers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-021", as: "dataSquad" }],
          hand: [{ card: "BT25-104", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 30000, as: "chosen" },
            { card: "BT1-013", dp: 30000, as: "other" },
            { card: "BT12-092", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chosen").currentDP === 15000);

    expect(s.perm("chosen").currentDP).toBe(15000);
    expect(s.perm("other").currentDP).toBe(30000);
    expect(s.perm("tamer").currentDP).toBe(0);
  });

  it("applies the -15000 effect before the rule check deletes a zero-DP opposing Digimon (Q6495)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-021", as: "dataSquad" }],
          hand: [{ card: "BT25-104", as: "option" }],
        },
        1: { battleArea: [{ card: "AD1-001", dp: 10000, as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
  });

  it("does not waive the red/yellow Option requirement without a DATA SQUAD card", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT25-104", as: "option" }] } });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("is enabled by a breeding DATA SQUAD Digimon but not by a DATA SQUAD Option in the battle area", async () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [
            expect.objectContaining({
              kind: "WaiveColorRequirement",
              condition: expect.objectContaining({
                kind: "youHave",
                filter: expect.objectContaining({ zone: ["battleArea", "breeding"], kind: ["Digimon", "Tamer"] }),
              }),
            }),
          ],
        }),
      ]),
    );

    const breeding = setupEngine(
      {
        0: {
          breeding: { card: "BT25-021", as: "breedingDataSquad" },
          hand: [{ card: "BT25-104", as: "option" }],
        },
        1: { battleArea: [{ card: "AD1-001", dp: 10000, as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    breeding.state.memory = 6;
    await breeding.ready();
    expect(
      breeding.engine.applyIntent(0, {
        type: "playCard",
        instanceId: breeding.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });

    const optionOnly = setupEngine({
      0: { battleArea: [{ card: "ST24-15", as: "dataSquadOption" }], hand: [{ card: "BT25-104", as: "option" }] },
    });
    optionOnly.state.memory = 6;
    await optionOnly.ready();
    expect(
      optionOnly.engine.applyIntent(0, {
        type: "playCard",
        instanceId: optionOnly.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("activates the Option-side Main effect from When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-104", as: "shine" }] },
        1: { battleArea: [{ card: "AD1-001", dp: 20000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shine"));
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000));

    expect(s.state.players[1]!.battleArea.some((p) => p.currentDP === 5000)).toBe(true);
  });

  it("treats the directly activated Main as an Option effect and may free-play a Tamer (Q6496-Q6498)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-104", as: "shine" }],
          hand: [{ card: "BT12-092", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 20000, as: "immune" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("immune").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { fromSourceKind: [CardKind.Digimon], byOpponentEffectsOnly: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shine"));
    await settle(() => s.perm("immune").currentDP === 5000);
    expect(s.perm("immune").currentDP).toBe(5000);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-092")).toBe(true);
  });

  it("shares one Once Per Turn activation across When Digivolving and When Attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-104", as: "shine" }] },
        1: { battleArea: [{ card: "BT1-013", dp: 40000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shine"));
    expect(s.perm("target").currentDP).toBe(25000);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("shine"));
    expect(s.perm("target").currentDP).toBe(25000);
  });

  it("treats every Marcus Damon as a 12000 DP Digimon with Rush and exposes all printed keywords", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT25-104", as: "shine" },
          { card: "BT13-095", as: "marcus" },
        ],
      },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("shine"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("shine"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("shine"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("shine"), "Barrier")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
  });

  it("Q6506 restores an earlier Marcus treatment and removes this card's Rush after public removal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-104", as: "shine" },
            { card: "BT13-095", as: "marcus" },
            { card: "BT13-008", as: "priorTreatment" },
          ],
          hand: [{ card: "BT4-031", as: "remover" }],
        },
        1: { battleArea: [{ card: "BT4-025", as: "opponentTarget" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 20;
    await s.ready();

    const prior = activatableEffects(s, s.perm("priorTreatment"))[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: prior.instanceId,
        effectKey: prior.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 12000);
    expect(s.perm("marcus").currentDP).toBe(12000);

    preferred.push(s.perm("shine").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("remover").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const removalDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: removalDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shine").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shine").instanceId);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);
  });
});

describe("BT25-104 ShineGreymon: Burst Mode — KB Q&A rulings", () => {
  const SHINE = "BT25-104";
  const MARCUS = "BT13-095";

  const onField = (s: ReturnType<typeof setupEngine>, seat: 0 | 1, instanceId: string) =>
    s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId);

  it("trashes the burst-digivolved top card at the end of that turn with the standard rules (Q6494)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-016", as: "base" },
            { card: MARCUS, as: "marcus" },
          ],
          hand: [{ card: SHINE, as: "burst" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 20000, as: "target" }], deck: ["BT1-009"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseInstanceId = s.perm("base").topCard.instanceId;
    const burstInstanceId = s.inst("burst").instanceId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: burstInstanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === burstInstanceId && s.state.pendingDecision === undefined);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("base").topCard.instanceId).toBe(baseInstanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(burstInstanceId);
  });

  it("activates its Option-side [Main] even while its controller can't use Option cards (Q6497)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: SHINE, as: "shine" }] },
        1: { battleArea: [{ card: "AD1-001", dp: 20000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addPlayProhibition(
      0,
      1,
      { kinds: ["Option"] },
      "play",
      EffectDuration.UntilOpponentTurnEnd,
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shine"));
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.perm("shine").topCard.cardId).toBe(SHINE);
    expect(s.state.players[0]!.resolvingOption).toBeUndefined();
  });

  it.each([true, false])(
    "lets a Marcus Damon treated as a Digimon attack and use its sources' inherited effects (Shine=%s) (Q6499)",
    async (withShine) => {
      const s = setupEngine({
        0: {
          battleArea: [...(withShine ? [{ card: SHINE }] : []), { card: MARCUS, as: "marcus", under: ["BT19-017"] }],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      });
      s.state.memory = 0;
      await s.ready();

      const attack = s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      });
      expect(attack.ok).toBe(withShine);
      if (withShine) await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

      expect(s.state.players[1]!.security).toHaveLength(withShine ? 1 : 2);
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT19-017")).toBe(
        withShine,
      );
    },
  );

  it.each([true, false])(
    "reports a source's inherited keyword on a Marcus Damon stack only while it is a Digimon (Shine=%s) (Q6499, BT5-094 Q1372)",
    async (withShine) => {
      const s = setupEngine({
        0: {
          battleArea: [...(withShine ? [{ card: SHINE }] : []), { card: MARCUS, as: "marcus", under: ["BT3-080"] }],
        },
      });
      await s.ready();

      expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Retaliation")).toBe(withShine);
    },
  );

  it("keeps Marcus Damon a Tamer while it is also a 12000 DP Digimon (Q6500)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: SHINE, as: "shine" },
            { card: MARCUS, as: "marcus" },
          ],
        },
        1: { battleArea: [{ card: "BT25-081", as: "fangmon" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.perm("marcus").currentDP).toBe(12000);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("fangmon"));
    await settle(() => s.perm("marcus").isSuspended);

    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.perm("shine").isSuspended).toBe(false);
  });

  /**
   * Marcus Damon, a Digimon through Shine's [Your Turn] effect, attacks. Suspending it triggers
   * its own [All Turns] effect: -3000 DP to an opponent's Digimon, then gain 1 memory.
   */
  async function marcusAttacks({ memoryLock, digimonImmune }: { memoryLock: boolean; digimonImmune: boolean }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: SHINE, as: "shine" },
            { card: MARCUS, as: "marcus" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 5000, as: "target" }], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    if (memoryLock) {
      advance(s.engine).ledgers.continuous.addMemoryGainPolicy(0, EffectDuration.UntilOpponentTurnEnd);
    }
    if (digimonImmune) {
      advance(s.engine).ledgers.continuous.addRestriction(
        s.perm("target").permanentId,
        "beAffected",
        EffectDuration.Permanent,
        { fromSourceKind: [CardKind.Digimon], byOpponentEffectsOnly: true },
      );
    }
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "effectTriggered", sourceCardId: MARCUS }));
    return s;
  }

  it("treats an effect of the Digimon-Tamer as both a Digimon and a Tamer effect (Q6501)", async () => {
    const s = await marcusAttacks({ memoryLock: true, digimonImmune: true });

    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.memory).toBe(1);
  });

  it.each([false, true])(
    "gains memory from the Digimon-Tamer's effect under a Tamer-effects-only memory lock (lock=%s) (Q6504)",
    async (memoryLock) => {
      const s = await marcusAttacks({ memoryLock, digimonImmune: false });

      expect(s.perm("target").currentDP).toBe(2000);
      expect(s.state.memory).toBe(1);
    },
  );

  it.each([false, true])(
    "doesn't affect an opponent's Digimon that isn't affected by Digimon effects (immune=%s) (Q6505)",
    async (digimonImmune) => {
      const s = await marcusAttacks({ memoryLock: false, digimonImmune });

      expect(s.perm("target").currentDP).toBe(digimonImmune ? 5000 : 2000);
    },
  );

  /**
   * On Shine's controller's turn, Marcus Damon (a 12000 DP Digimon) has already lost 9000 DP.
   * The opponent's Guardromon [On Play] gives Marcus -3000 DP, then may ＜De-Digivolve 1＞ Shine.
   */
  async function guardromonHitsMarcus(dedigivolveShine: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: SHINE, as: "shine", under: ["AD1-016"] },
            { card: MARCUS, as: "marcus" },
          ],
        },
        1: {
          battleArea: [{ card: "BT22-056", as: "guardromon", under: dedigivolveShine ? ["BT22-056"] : ["BT22-054"] }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const marcusId = s.perm("marcus").topCard.instanceId;
    const shinePermanentId = s.perm("shine").permanentId;
    await advance(s.engine).verb.modifyDP(s.perm("marcus").permanentId, -9000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("marcus").currentDP).toBe(3000);

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("guardromon"));
    const answerTargets = async (permanentId: string) => {
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "chooseTargets", instanceIds: [permanentId] },
        }),
      ).toEqual({ ok: true });
    };
    await answerTargets(s.perm("marcus").permanentId);
    if (dedigivolveShine) await answerTargets(shinePermanentId);
    await resolving;
    await settle(() => s.state.pendingDecision === undefined);
    return Object.assign(s, { marcusId });
  }

  it("deletes a Marcus Damon Digimon whose DP drops to 0 at the rule check (Q6502)", async () => {
    const s = await guardromonHitsMarcus(false);

    expect(onField(s, 0, s.marcusId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.marcusId);
  });

  it("does not delete Marcus Damon at 0 DP once De-Digivolve removed this card before the rule check (Q6947)", async () => {
    const s = await guardromonHitsMarcus(true);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(SHINE);
    expect(onField(s, 0, s.marcusId)).toBe(true);
  });

  it("keeps overwriting a later triggered Digimon treatment with its persistent 12000 DP (Q6503)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: SHINE, as: "shine" },
            { card: MARCUS, as: "marcus" },
            { card: "BT13-008", as: "laterTreatment" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("marcus").currentDP).toBe(12000);

    const later = activatableEffects(s, s.perm("laterTreatment"))[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: later.instanceId,
        effectKey: later.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).activatableEffects(s.perm("laterTreatment")).length === 0);
    await drainMicrotasks();

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "effectActivated", sourceCardId: "BT13-008" }));

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
  });

  it("counts as an Option card with the [DATA SQUAD] trait (Q6507)", async () => {
    const reveal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-021", as: "gaomon" }],
          deck: [{ card: SHINE, as: "revealed" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await reveal.ready();
    const revealedId = reveal.inst("revealed").instanceId;
    await advance(reveal.engine).fire(EffectTiming.OnPlay, reveal.perm("gaomon"));
    await settle(() => reveal.state.pendingDecision === undefined);
    expect(reveal.state.players[0]!.hand.map((card) => card.instanceId)).toContain(revealedId);

    const cost = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-085", as: "beel", suspended: true },
            { card: "BT1-009", as: "host", under: [{ card: SHINE, as: "optionSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Use an Option"] },
    );
    await cost.ready();
    const optionSourceId = cost.inst("optionSource").instanceId;
    await advance(cost.engine).fireForPermanent(EffectTiming.WhenDigivolving, cost.perm("beel"));
    await settle(() => !cost.perm("beel").isSuspended);

    expect(cost.perm("host").stack).toHaveLength(0);
    expect(cost.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionSourceId);
  });
});

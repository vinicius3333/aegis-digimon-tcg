import { describe, expect, it } from "vitest";
import { CardKind, EffectDuration, EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
  (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
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
    // Final Shining Burst applies -15000, then the replayed Marcus suspends and applies
    // its own -3000 reaction. Prove the completed nested chain rather than its 5000-DP
    // intermediate state.
    expect(s.perm("target").currentDP).toBe(2000);
    // The Burst cost returns Marcus, then this card's mandatory When Digivolving
    // activates its Option-side Main. With auto-selection enabled, that optional Main
    // replays Marcus; his On Play suspension gains 1 memory while a Greymon is present.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === marcusId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marcusId)).toBe(true);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(true);

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === priorTop)).toBe(true);
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

  it("requires a DATA SQUAD Digimon or Tamer in the battle area for Use Req.", async () => {
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [
            expect.objectContaining({
              kind: "WaiveColorRequirement",
              condition: expect.objectContaining({
                kind: "youHave",
                filter: expect.objectContaining({ zone: "battleArea", kind: ["Digimon", "Tamer"] }),
              }),
            }),
          ],
        }),
      ]),
    );

    for (const board of [
      { breeding: { card: "BT25-021", as: "breedingDataSquad" } },
      { battleArea: [{ card: "ST24-15", as: "dataSquadOption" }] },
    ]) {
      const s = setupEngine({ 0: { ...board, hand: [{ card: "BT25-104", as: "option" }] } });
      s.state.memory = 6;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("option").instanceId,
          useAs: "option",
        } as never),
      ).toEqual({ ok: false, reason: "color-requirement-unmet" });
    }
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

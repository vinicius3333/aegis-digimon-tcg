import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { definitionMatches } from "../../engine/effects/interpreter/matching/definition.js";
import "../index.js";
import { compiled } from "./BT23-012.js";

describe("BT23-012 Garudamon", () => {
  it("matches the catalog and carries both deletion faces with the exact trait disjunction", () => {
    expect(getCardDefinition("BT23-012")).toMatchObject({
      cardId: "BT23-012",
      nameEn: "Garudamon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Birdkin", "CS"],
      effectText:
        "[Digivolve] Lv.4 w/[CS]\u00a0trait: Cost 3 \n\n[On Play] [When Digivolving] 1 of your Digimon gains ＜Raid＞ for the turn. \n[On Deletion] You may play 1 level 4 or lower Digimon card with the [CS]\u00a0trait or [Avian], [Bird], [Beast], [Animal] or [Sovereign]\u00a0in any of its traits (other than [Sea Animal]) from your hand without paying the cost.",
      inheritedEffectText:
        "[On Deletion] You may play 1 level 4 or lower Digimon card with the [CS]\u00a0trait or [Avian], [Bird], [Beast], [Animal] or [Sovereign]\u00a0in any of its traits (other than [Sea Animal]) from your hand without paying the cost.",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            keyword: { keyword: "Raid", raw: "＜Raid＞" },
            duration: "forTheTurn",
          },
        ],
      });
    }
    const effects = compiled.effects.filter((entry) => entry.trigger === "OnDeletion");
    expect(effects).toHaveLength(2);
    expect(effects.map((effect) => effect.isInherited ?? false)).toEqual([false, true]);
    for (const effect of effects) {
      expect(effect.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            or: [
              { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
              { nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Sovereign"], match: "traitContains" }] },
              {
                nameOrTrait: [{ tokens: ["Animal"], match: "traitContains" }],
                excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
              },
            ],
          },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
        optional: true,
      });
    }
    expect(compiled).toMatchObject({
      digivolutionRequirement: [{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }],
      coverage: "full",
      residual: [],
    });
  });

  it.each([
    ["play", "BT1-012"],
    ["digivolve", "BT22-022"],
  ])("grants Raid for the turn through %s", async (mode, baseOrHand) => {
    const s =
      mode === "play"
        ? setupEngine(
            { 0: { hand: [{ card: "BT23-012", as: "garuda" }], battleArea: [{ card: baseOrHand, as: "recipient" }] } },
            { autoSelectCards: true },
          )
        : setupEngine(
            {
              0: {
                battleArea: [{ card: baseOrHand, as: "recipient" }],
                hand: [{ card: "BT23-012", as: "garuda" }],
                deck: ["BT1-009"],
              },
            },
            { autoSelectCards: true },
          );
    s.state.memory = 7;
    if (mode === "play") {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garuda").instanceId })).toEqual({
        ok: true,
      });
    } else {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("recipient").permanentId,
          instanceId: s.inst("garuda").instanceId,
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Raid"));
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Raid")).toBe(true);
  });

  /**
   * Reach an [On Deletion] through a real battle: seat 0 attacks into security to suspend the
   * host (its own unsuspend phase clears a board-spec suspension), then seat 1 attacks and wins
   * the battle. Returns once the host has actually left the battle area.
   */
  async function battleDeleteHost(
    host: { card: string; under?: string[] },
    hand: { card: string; as: string }[],
    opts: { decline?: boolean } = {},
  ) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: host.card, under: host.under, dp: 3000, as: "host" }],
          hand,
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 12000, as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      opts.decline === true
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.state.players[1]!.security.length === 0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    return { s, loop };
  }

  it("plays an Animal-family level-4-or-lower card for the top-card On Deletion, per Q5220", async () => {
    const { s, loop } = await battleDeleteHost({ card: "BT23-012" }, [{ card: "BT1-012", as: "bird" }]);
    const memoryBeforeResolution = s.state.memory;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("bird").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("bird").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("bird").instanceId);
    expect(s.state.memory).toBe(memoryBeforeResolution);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reads [Giant Bird] as [Bird] per CR 2-3-2-4 and plays it from hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-012", as: "garuda" }], hand: [{ card: "BT1-014", as: "giantBird" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).verb.deletePermanent([s.perm("garuda").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("giantBird").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("giantBird").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("giantBird").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("matches every compound trait spelling and still rejects a card-level [Sea Animal]", () => {
    const deletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")!;
    const filter = deletion.actions.find((action) => action.kind === "PlayWithoutCost")!.target.filter;
    const base = { ...getCardDefinition("BT1-014")!, level: 4 };
    for (const trait of ["Giant Bird", "Holy Beast", "Dark Animal", "Bird Dragon", "Four Sovereign"]) {
      expect(definitionMatches(filter, { ...base, types: [trait] })).toBe(true);
    }
    expect(definitionMatches(filter, { ...base, types: ["Sea Animal"] })).toBe(false);
    // Q5220: [Sea Animal] is excluded from the [Animal] reading only. A card that also
    // carries [Beast] still has [Beast] in its traits, so it remains playable.
    expect(definitionMatches(filter, { ...base, types: ["Sea Animal", "Beast"] })).toBe(true);
    expect(definitionMatches(filter, { ...base, types: ["Machine"] })).toBe(false);
  });

  it("keeps the [CS] branch on exact CR 2-3-2-3 matching", () => {
    const deletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")!;
    const filter = deletion.actions.find((action) => action.kind === "PlayWithoutCost")!.target.filter;
    const base = { ...getCardDefinition("BT1-014")!, level: 4 };
    expect(definitionMatches(filter, { ...base, types: ["CS"] })).toBe(true);
    expect(definitionMatches(filter, { ...base, types: ["CSX"] })).toBe(false);
  });

  it("plays an off-color CS level-4-or-lower card for inherited On Deletion, per Q5221", async () => {
    const { s, loop } = await battleDeleteHost({ card: "BT1-014", under: ["BT23-012"] }, [
      { card: "BT22-017", as: "cs" },
    ]);
    const memoryBeforeResolution = s.state.memory;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("cs").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("cs").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("cs").instanceId);
    expect(s.state.memory).toBe(memoryBeforeResolution);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("excludes Sea Animal and level 5 even when the other trait branch would otherwise match", async () => {
    const { s, loop } = await battleDeleteHost({ card: "BT23-012" }, [
      { card: "BT1-033", as: "seaAnimal" },
      { card: "BT22-011", as: "level5Cs" },
    ]);
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("seaAnimal").instanceId, s.inst("level5Cs").instanceId]),
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("allows the deletion play to be refused without moving the card", async () => {
    const { s, loop } = await battleDeleteHost({ card: "BT23-012" }, [{ card: "BT1-012", as: "bird" }], {
      decline: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("bird").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("bird").instanceId)).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("expires the public Raid grant at the opponent's turn boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-012", as: "garuda" }],
          battleArea: [{ card: "BT1-012", as: "recipient" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garuda").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Raid"));
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Raid")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Raid")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("proves the synthetic CS plus Sea Animal level boundary without catalog mutation", () => {
    const deletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")!;
    const play = deletion.actions.find((action) => action.kind === "PlayWithoutCost")!;
    const filter = play.target.filter;
    const realWhamon = getCardDefinition("BT23-023")!;
    const mixedLevel4 = { ...realWhamon, level: 4 };
    const seaOnlyLevel4 = { ...mixedLevel4, types: ["Sea Animal"] };
    expect(definitionMatches(filter, mixedLevel4)).toBe(true);
    expect(definitionMatches(filter, seaOnlyLevel4)).toBe(false);
    expect(definitionMatches(filter, realWhamon)).toBe(false);
  });
});

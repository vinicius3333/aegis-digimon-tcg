import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
              {
                nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" }],
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

  it("plays an Animal-family level-4-or-lower card for the top-card On Deletion, per Q5220", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-012", as: "garuda" }], hand: [{ card: "BT1-012", as: "bird" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).verb.deletePermanent([s.perm("garuda").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("bird").instanceId));
    expect(s.state.memory).toBe(2);
  });

  it("plays an off-color CS level-4-or-lower card for inherited On Deletion, per Q5221", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-013", under: ["BT23-012"], as: "host" }],
          hand: [{ card: "BT22-017", as: "cs" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("cs").instanceId));
    expect(s.state.memory).toBe(2);
  });

  it("excludes Sea Animal and level 5 even when the other trait branch would otherwise match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-012", as: "garuda" }],
          hand: [
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT22-011", as: "level5Cs" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("garuda").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("seaAnimal").instanceId, s.inst("level5Cs").instanceId]),
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("allows the deletion play to be refused without moving the card or memory", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-012", as: "garuda" }], hand: [{ card: "BT1-012", as: "bird" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).verb.deletePermanent([s.perm("garuda").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("bird").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("resolves top-card On Deletion after a natural battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-012", suspended: true, as: "garuda" }],
          hand: [{ card: "BT1-012", as: "bird" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 10000, as: "attacker" }], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("garuda").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("bird").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("bird").instanceId)).toBe(true);
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
});

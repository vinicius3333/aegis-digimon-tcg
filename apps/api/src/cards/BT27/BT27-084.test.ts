import { EffectTiming } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/knightmon-buffs-later-entrants.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT27-084.js";
import "../index.js";

const LORD_KNIGHTMON = "BT13-090";
const X_ANTIBODY = "BT9-109";
const KNIGHTMON_COST_5 = "ST13-12";
const SKULLKNIGHTMON_COST_4 = "BT19-058";
const PLAIN_LEVEL_3 = "BT1-009";
const PURPLE_LEVEL_5 = "BT2-075";
const BLACK_LEVEL_5 = "BT10-064";
const RED_LEVEL_5 = "BT1-020";

async function duringMainPhase(s: EngineSetup, seat: Seat, memory: number, body: () => Promise<void>) {
  s.state.turnSeat = seat;
  s.state.memory = memory;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(seat);
  await body();
  advance(s.engine).endMainPhaseIfOpen(seat);
  await turn;
}

function battleAreaCardIds(s: EngineSetup, seat: Seat): string[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

function stackCardIds(s: EngineSetup, alias: string): string[] {
  return s.perm(alias).stack.map((card) => card.cardId);
}

describe("BT27-084 LordKnightmon (X Antibody)", () => {
  it("prints Alliance, Collision, Piercing and Blocker and digivolves from [LordKnightmon] for 2", async () => {
    expect(digivolutionRequirementsFor("BT27-084")).toEqual(compiled.digivolutionRequirement);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LORD_KNIGHTMON, as: "lord" }],
          hand: [{ card: "BT27-084", as: "xAntibody" }],
          deck: [PLAIN_LEVEL_3],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lord").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lord").topCard.cardId === "BT27-084");

    expect(s.state.memory).toBe(0);
    const view = observe(s.engine);
    for (const keyword of ["Alliance", "Collision", "Piercing", "Blocker"]) {
      expect(view.hasKeyword(s.perm("lord"), keyword)).toBe(true);
    }
  });

  it.each([
    ["purple", PURPLE_LEVEL_5],
    ["black", BLACK_LEVEL_5],
  ])("digivolves from a %s level 5 Digimon for 4", async (_color, base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT27-084", as: "xAntibody" }],
          deck: [PLAIN_LEVEL_3],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT27-084");

    expect(s.state.memory).toBe(0);
  });

  it("can't digivolve from a level 5 Digimon that is neither purple nor black", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: RED_LEVEL_5, as: "base" }],
        hand: [{ card: "BT27-084", as: "xAntibody" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("needs both purple and black on the field to use its Option side", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: PURPLE_LEVEL_5, as: "purpleOnly" }],
        hand: [{ card: "BT27-084", as: "option" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("can't be played to the field", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT27-084", as: "xAntibody" }] } });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xAntibody").instanceId, useAs: "digimon" }),
    ).toMatchObject({ ok: false });
    expect(battleAreaCardIds(s, 0)).toEqual([]);
  });

  it("plays [Knightmon] text cards from the hand within 8 total play cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LORD_KNIGHTMON, as: "lord" }],
          hand: [
            { card: "BT27-084", as: "xAntibody" },
            { card: KNIGHTMON_COST_5, as: "knightmon" },
            { card: SKULLKNIGHTMON_COST_4, as: "skullKnightmon" },
            { card: PLAIN_LEVEL_3, as: "plain" },
          ],
          trash: [{ card: KNIGHTMON_COST_5, as: "trashKnightmon" }],
          deck: [PLAIN_LEVEL_3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["trashing"] },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lord").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle();

    const played = battleAreaCardIds(s, 0).filter((cardId) => cardId !== "BT27-084");
    expect(played).toHaveLength(1);
    expect([KNIGHTMON_COST_5, SKULLKNIGHTMON_COST_4]).toContain(played[0]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plain").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashKnightmon").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
  });

  it("activates the Option side when another Digimon is played, paying with a [LordKnightmon] source once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-084", as: "xAntibody", under: [{ card: LORD_KNIGHTMON, as: "lordSource" }] }],
          hand: [
            { card: PLAIN_LEVEL_3, as: "first" },
            { card: PLAIN_LEVEL_3, as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: PLAIN_LEVEL_3, as: "lowest" },
            { card: PURPLE_LEVEL_5, as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle();

    expect(stackCardIds(s, "xAntibody")).not.toContain(LORD_KNIGHTMON);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("lordSource").instanceId)).toBe(true);
    expect(battleAreaCardIds(s, 1)).toEqual([PURPLE_LEVEL_5]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(battleAreaCardIds(s, 1)).toEqual([PURPLE_LEVEL_5]);
  });

  it("activates the Option side when another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-084", as: "xAntibody", under: [{ card: LORD_KNIGHTMON, as: "lordSource" }] },
            { card: PLAIN_LEVEL_3, as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: PURPLE_LEVEL_5, as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();

    expect(battleAreaCardIds(s, 0)).toEqual(["BT27-084"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("lordSource").instanceId)).toBe(true);
    expect(battleAreaCardIds(s, 1)).toEqual([]);
  });

  it("can't pay with the BT9-109 [X Antibody] source, whose inherited effect stops effects trashing it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-084", as: "xAntibody", under: [{ card: X_ANTIBODY, as: "antibodySource" }] }],
          hand: [{ card: PLAIN_LEVEL_3, as: "played" }],
        },
        1: { battleArea: [{ card: PLAIN_LEVEL_3, as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(stackCardIds(s, "xAntibody")).toEqual([X_ANTIBODY]);
    expect(battleAreaCardIds(s, 1)).toEqual([PLAIN_LEVEL_3]);
  });

  it("does not activate without a [LordKnightmon] or [X Antibody] digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-084", as: "xAntibody", under: [{ card: PURPLE_LEVEL_5, as: "otherSource" }] }],
          hand: [{ card: PLAIN_LEVEL_3, as: "played" }],
        },
        1: { battleArea: [{ card: PLAIN_LEVEL_3, as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(stackCardIds(s, "xAntibody")).toContain(PURPLE_LEVEL_5);
    expect(battleAreaCardIds(s, 1)).toEqual([PLAIN_LEVEL_3]);
  });

  it("lets the controller decline the source-trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-084", as: "xAntibody", under: [{ card: LORD_KNIGHTMON, as: "lordSource" }] }],
          hand: [{ card: PLAIN_LEVEL_3, as: "played" }],
        },
        1: { battleArea: [{ card: PLAIN_LEVEL_3, as: "lowest" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(stackCardIds(s, "xAntibody")).toContain(LORD_KNIGHTMON);
    expect(battleAreaCardIds(s, 1)).toEqual([PLAIN_LEVEL_3]);
  });

  it("protects and boosts [Knightmon] text Digimon until the end of the turn it is used in when it deletes nothing", async () => {
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      declinePrompts: ["Arts Digivolve"],
    });
    const view = observe(s.engine);

    await duringMainPhase(s, 0, 10, async () => {
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT27-084"));

      expect(view.hasKeyword(s.perm("knightmon"), "Blocker")).toBe(true);
      expect(s.perm("knightmon").immuneToOpponentDigimonEffects).toBe(true);
      expect(s.perm("knightmon").currentDP).toBe(10000);
      expect(view.hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
      expect(s.perm("plain").immuneToOpponentDigimonEffects).toBe(false);
      expect(s.perm("plain").currentDP).toBe(7000);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("laterKnight").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("laterKnight").instanceId,
        ),
      );
      const laterKnight = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("laterKnight").instanceId,
      )!;
      expect(view.hasKeyword(laterKnight, "Blocker")).toBe(true);
      expect(laterKnight.immuneToOpponentDigimonEffects).toBe(true);
      expect(laterKnight.currentDP).toBe(10000);
      expect(JSON.parse(s.state.players[0]!.fieldEffectsJson)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "dp",
            effectText: "All of your Digimon with [Knightmon] in their texts get +3000 DP.",
          }),
          expect.objectContaining({
            kind: "keyword",
            effectText: "All of your Digimon with [Knightmon] in their texts gain ＜Blocker＞.",
          }),
          expect.objectContaining({
            kind: "restriction",
            sourceCardId: "BT27-084",
            fromSourceKind: ["Digimon"],
            byOpponentEffectsOnly: true,
            effectText:
              "Your opponent's Digimon effects don't affect any of your Digimon with [Knightmon] in their texts.",
          }),
        ]),
      );
    });

    await duringMainPhase(s, 1, 3, async () => {
      expect(view.hasKeyword(s.perm("knightmon"), "Blocker")).toBe(false);
      expect(s.perm("knightmon").immuneToOpponentDigimonEffects).toBe(false);
      expect(s.perm("knightmon").currentDP).toBe(7000);
      const laterKnight = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("laterKnight").instanceId,
      )!;
      expect(view.hasKeyword(laterKnight, "Blocker")).toBe(false);
      expect(laterKnight.immuneToOpponentDigimonEffects).toBe(false);
      expect(laterKnight.currentDP).toBe(7000);
    });
  });

  it("prevents an opponent Digimon's deletion after the Option grants immunity", async () => {
    const preferred: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
      declinePrompts: ["Arts Digivolve"],
    });
    await s.ready();
    await duringMainPhase(s, 0, 10, async () => {
      preferred.push(s.perm("knightmon").topCard.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("option").instanceId,
          useAs: "option",
        }),
      ).toEqual({ ok: true });
      await settle();
      const knightmonId = s.perm("knightmon").permanentId;
      s.putOnBoard(1, { card: "AD1-004", as: "warGreymon" });
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("warGreymon"));
      await settle();
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === knightmonId)).toBe(true);
      expect(s.perm("knightmon").immuneToOpponentDigimonEffects).toBe(true);
    });
  });

  it("deletes only the opponent's lowest level Digimon and skips the boost when it deletes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: KNIGHTMON_COST_5, as: "knightmon" },
            { card: PURPLE_LEVEL_5, as: "colorSource" },
          ],
          hand: [{ card: "BT27-084", as: "option" }],
        },
        1: {
          battleArea: [
            { card: PLAIN_LEVEL_3, as: "lowest" },
            { card: PURPLE_LEVEL_5, as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT27-084"));

    expect(battleAreaCardIds(s, 1)).toEqual([PURPLE_LEVEL_5]);
    expect(observe(s.engine).hasKeyword(s.perm("knightmon"), "Blocker")).toBe(false);
    expect(s.perm("knightmon").immuneToOpponentDigimonEffects).toBe(false);
    expect(s.perm("knightmon").currentDP).toBe(7000);
  });

  it("Arts Digivolves into itself onto a purple Lv.5 for free after its Option side is used", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: PURPLE_LEVEL_5, as: "host" },
            { card: BLACK_LEVEL_5, as: "colorSource", suspended: true },
          ],
          hand: [{ card: "BT27-084", as: "dual" }],
        },
        1: { battleArea: [{ card: PLAIN_LEVEL_3, as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dual").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT27-084" && s.state.pendingDecision === undefined, 5000);

    expect(stackCardIds(s, "host")).toEqual([PURPLE_LEVEL_5]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT27-084")).toBe(false);
    expect(battleAreaCardIds(s, 1)).toEqual([]);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT27-084 official rulings", () => {
  const SKULLKNIGHTMON = SKULLKNIGHTMON_COST_4;
  const GLADIMON_KNIGHTMON_IN_EFFECT = "BT18-062";
  const DATAMON_EFFECT_DELETION_PROOF = "BT14-062";
  const DARKDRAMON = "BT27-071";
  const LILITHMON = "BT3-091";
  const KUWAGAMON_SUSPENDER = "BT1-070";
  const ANGEMON_DP_REDUCER = "BT1-055";

  async function useOptionSide(s: EngineSetup) {
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
        s.state.pendingDecision === undefined,
    );
  }

  function optionUser(opponentBattleArea: { card: string; as: string }[], decline = false) {
    return setupEngine(
      {
        0: {
          battleArea: [{ card: SKULLKNIGHTMON, as: "skull" }],
          hand: [{ card: "BT27-084", as: "option" }],
        },
        1: { battleArea: opponentBattleArea },
      },
      decline
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
  }

  it("counts a Digimon whose name contains [Knightmon] and one with [Knightmon] only in its effect as having it in their texts", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: SKULLKNIGHTMON, as: "skull" },
            { card: GLADIMON_KNIGHTMON_IN_EFFECT, as: "gladimon" },
            { card: PURPLE_LEVEL_5, as: "plain" },
          ],
          hand: [{ card: "BT27-084", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 10;
    await s.ready();

    await useOptionSide(s);

    expect(s.perm("skull").currentDP).toBe(7000);
    expect(s.perm("gladimon").currentDP).toBe(8000);
    expect(s.perm("plain").currentDP).toBe(7000);
    expect(s.perm("skull").immuneToOpponentDigimonEffects).toBe(true);
    expect(s.perm("gladimon").immuneToOpponentDigimonEffects).toBe(true);
    expect(s.perm("plain").immuneToOpponentDigimonEffects).toBe(false);
  });

  it("resolves the field-activated Option side as an Option effect that deletes a Digimon immune to Digimon effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-084", as: "xAntibody", under: [{ card: LORD_KNIGHTMON, as: "lordSource" }] }],
          hand: [{ card: PLAIN_LEVEL_3, as: "played" }],
        },
        1: { battleArea: [{ card: DARKDRAMON, as: "darkdramon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("darkdramon"));
    await settle();
    expect(s.perm("darkdramon").immuneToOpponentDigimonEffects).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("lordSource").instanceId)).toBe(true);
    expect(battleAreaCardIds(s, 1)).toEqual([]);
  });

  it("does not count activating the Option side from the field as using an Option card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-084", as: "xAntibody", under: [{ card: LORD_KNIGHTMON, as: "lordSource" }] },
            { card: LILITHMON, as: "lilithmon" },
          ],
          hand: [{ card: PLAIN_LEVEL_3, as: "played" }],
        },
        1: { battleArea: [{ card: PLAIN_LEVEL_3, as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(battleAreaCardIds(s, 1)).toEqual([]);
    expect(battleAreaCardIds(s, 0)).toEqual(expect.arrayContaining(["BT27-084", LILITHMON, PLAIN_LEVEL_3]));
    expect(s.state.memory).toBe(8);
  });

  it("must delete the opponent's lowest level Digimon even when every optional prompt is declined", async () => {
    const s = optionUser([{ card: PLAIN_LEVEL_3, as: "lowest" }], true);
    s.state.memory = 10;
    await s.ready();

    await useOptionSide(s);

    expect(battleAreaCardIds(s, 1)).toEqual([]);
    expect(s.perm("skull").currentDP).toBe(4000);
    expect(s.perm("skull").immuneToOpponentDigimonEffects).toBe(false);
  });

  it("buffs [Knightmon] text Digimon when the chosen lowest level Digimon survives through deletion protection", async () => {
    const s = optionUser([{ card: DATAMON_EFFECT_DELETION_PROOF, as: "datamon" }]);
    s.state.memory = 10;
    await s.ready();

    await useOptionSide(s);

    expect(battleAreaCardIds(s, 1)).toEqual([DATAMON_EFFECT_DELETION_PROOF]);
    expect(observe(s.engine).hasKeyword(s.perm("skull"), "Blocker")).toBe(true);
    expect(s.perm("skull").immuneToOpponentDigimonEffects).toBe(true);
    expect(s.perm("skull").currentDP).toBe(7000);
  });

  it("lets the opponent's Digimon effects choose the immune Digimon without suspending it or reducing its DP", async () => {
    const s = optionUser([]);
    s.state.memory = 10;
    await s.ready();
    await useOptionSide(s);
    const skull = s.perm("skull");

    s.putOnBoard(1, { card: KUWAGAMON_SUSPENDER, as: "kuwagamon" });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));
    await settle();

    expect(
      s.decisions
        .filter(({ seat, req }) => seat === 1 && req.kind === "chooseTargets")
        .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []),
    ).toEqual([skull.permanentId]);
    expect(skull.isSuspended).toBe(false);

    s.putOnBoard(1, { card: ANGEMON_DP_REDUCER, as: "angemon" });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));
    await settle();

    expect(skull.currentDP).toBe(7000);
  });

  it("stops an earlier DP reduction from the opponent's Digimon as soon as the immunity is gained", async () => {
    const s = optionUser([]);
    s.state.memory = 10;
    await s.ready();
    s.putOnBoard(1, { card: ANGEMON_DP_REDUCER, as: "angemon" });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));
    await settle();
    expect(s.perm("skull").currentDP).toBe(1000);
    await advance(s.engine).verb.deletePermanent([s.perm("angemon").permanentId]);
    expect(s.perm("skull").currentDP).toBe(1000);

    await useOptionSide(s);

    expect(s.perm("skull").immuneToOpponentDigimonEffects).toBe(true);
    expect(s.perm("skull").currentDP).toBe(7000);
  });

  it("lets King Drasil use the Option side as a [Royal Knight] trait Option card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-104", as: "kingDrasil" },
            { card: SKULLKNIGHTMON, as: "skull" },
          ],
          hand: [{ card: "BT27-084", as: "option" }],
          deck: [PLAIN_LEVEL_3],
        },
        1: { battleArea: [{ card: PLAIN_LEVEL_3, as: "lowest" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 4;

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("kingDrasil"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("kingDrasil").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(battleAreaCardIds(s, 1)).toEqual([]);
    expect(s.state.memory).toBe(2);
  });

  it("keeps a Security A. -1 given by the opponent's Digimon from reducing the immune Digimon's checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SKULLKNIGHTMON, as: "skull" }],
          hand: [{ card: "BT27-084", as: "option" }],
        },
        1: { security: [PLAIN_LEVEL_3, PLAIN_LEVEL_3] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 10;
    await s.ready();
    await useOptionSide(s);
    s.putOnBoard(1, { card: "EX10-014", as: "weatherdramon" });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weatherdramon"));
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trigger a [When Attacking] effect the opponent's Digimon gave the immune Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SKULLKNIGHTMON, as: "skull" }],
          hand: [{ card: "BT27-084", as: "option" }],
        },
        1: { security: [PLAIN_LEVEL_3, PLAIN_LEVEL_3] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );
    s.state.memory = 10;
    await s.ready();
    await useOptionSide(s);
    s.putOnBoard(1, { card: "EX4-018", as: "mailBirdramon" });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mailBirdramon"));
    await settle();
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });

  it("applies the opponent's Digimon unsuspend lock once the immunity ends with the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SKULLKNIGHTMON, as: "skull" }],
          hand: [{ card: "BT27-084", as: "option" }],
          deck: [PLAIN_LEVEL_3, PLAIN_LEVEL_3, PLAIN_LEVEL_3],
        },
        1: {
          security: [PLAIN_LEVEL_3, PLAIN_LEVEL_3, PLAIN_LEVEL_3, PLAIN_LEVEL_3],
          deck: [PLAIN_LEVEL_3, PLAIN_LEVEL_3, PLAIN_LEVEL_3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Arts Digivolve"] },
    );

    await duringMainPhase(s, 0, 10, async () => {
      await useOptionSide(s);
      s.putOnBoard(1, { card: "BT16-044", as: "pistmon" });
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pistmon"));
      await settle();
      expect(s.perm("skull").isSuspended).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("skull").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      await settle();
      expect(s.perm("skull").isSuspended).toBe(true);
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("skull").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});

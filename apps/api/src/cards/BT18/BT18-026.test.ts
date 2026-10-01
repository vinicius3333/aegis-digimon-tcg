import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import {
  setupEngine,
  settle,
  type CardSpec,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-026.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-085.js";
import "./BT18-022.js";
import "./BT18-025.js";
import "./BT18-089.js";

describe("BT18-026 DaiPenmon", () => {
  it("pays both named trash placements and 3 memory for its hand Main evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-026", as: "dai" }],
          trash: [
            { card: "BT18-022", as: "kumamon" },
            { card: "BT18-025", as: "korikakumon" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tommy").topCard.instanceId, s.inst("kumamon").instanceId, s.inst("korikakumon").instanceId);
    s.state.memory = 5;
    await s.ready();
    const source = s.inst("dai");
    const effectKey = handMainEffectKey(s, "dai");
    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => s.perm("tommy").topCard.cardId === "BT18-026");

    expect(s.state.memory).toBe(2);
    expect(s.perm("tommy").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT18-022", "BT18-025", "BT18-089"]),
    );
  });

  it("cannot partially pay the hand Main cost when Korikakumon is absent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-026", as: "dai" }],
          trash: [{ card: "BT18-022", as: "kumamon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    await s.ready();
    const source = s.inst("dai");
    const effectKey = handMainEffectKey(s, "dai");
    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      {
        ok: false,
        reason: "illegal-target",
      },
    );

    expect(s.perm("tommy").topCard.cardId).toBe("BT18-089");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT18-022");
    expect(s.state.memory).toBe(5);
  });

  it("naturally deletes an opposing empty-stack Digimon after evolving from a Hybrid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-025", as: "hybrid" }],
          hand: [{ card: "BT18-026", as: "dai" }],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hybrid").permanentId,
        instanceId: s.inst("dai").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(false);
  });

  it("digivolves from a blue/red level-4 Hybrid for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-025", as: "hybrid" }],
        hand: [{ card: "BT18-026", as: "dai" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hybrid").permanentId,
        instanceId: s.inst("dai").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hybrid").topCard.cardId === "BT18-026");

    expect(s.state.memory).toBe(2);
    expect(s.perm("hybrid").stack.at(-1)?.cardId).toBe("BT18-025");
  });

  it("exposes Ice Clad, the Ice-Snow Rule trait, and inherited +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-026", as: "self" },
          { card: "BT1-030", dp: 3000, as: "host", under: ["BT18-026"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("self"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("self"), "Ice-Snow")).toBe(true);
    expect(s.perm("host").currentDP).toBe(5000);
  });
});

const DAIPENMON = "BT18-026";
const TOMMY = "BT18-089";
const KUMAMON = "BT18-022";
const KORIKAKUMON = "BT18-025";
const DAVIS_AND_KEN = "BT16-085";
const KING_DRASIL_7D6 = "BT13-007";
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function handMainEffectKey(s: EngineSetup, alias: string): string {
  const effect = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.inst(alias))).find((candidate) =>
    candidate.effectKey.startsWith(`${DAIPENMON}/`),
  );
  expect(effect, `no [Main] declaration effect on ${alias}`).toBeDefined();
  return effect!.effectKey;
}

function activateHandMain(s: EngineSetup, alias: string) {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.inst(alias).instanceId,
    effectKey: handMainEffectKey(s, alias),
  });
}

interface TommyBoardOptions {
  tommyEnteredThisTurn?: boolean;
  extraBattleArea?: PermanentSpec[];
  extraHand?: CardSpec[];
  breeding?: PermanentSpec;
  acceptOptionalEffects?: boolean;
}

function setupTommyBoard(options: TommyBoardOptions = {}) {
  const preferred: string[] = [];
  const optionalAnswer = options.acceptOptionalEffects ? { autoAcceptOptional: true } : { autoDeclineOptional: true };
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: TOMMY, as: "tommy", enteredThisTurn: options.tommyEnteredThisTurn ?? false },
          ...(options.extraBattleArea ?? []),
        ],
        ...(options.breeding === undefined ? {} : { breeding: options.breeding }),
        hand: [{ card: DAIPENMON, as: "dai" }, ...(options.extraHand ?? [])],
        trash: [
          { card: KUMAMON, as: "kumamon" },
          { card: KORIKAKUMON, as: "korikakumon" },
        ],
        deck: [{ card: "BT1-010", as: "bonusDraw" }, ...FILLER],
        security: 3,
      },
      1: { deck: [...FILLER], security: 3 },
    },
    { autoSelectCards: true, ...optionalAnswer, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("tommy").topCard.instanceId, s.inst("kumamon").instanceId, s.inst("korikakumon").instanceId);
  s.state.memory = 10;
  return s;
}

function digivolveHybridIntoDaiPenmon(s: EngineSetup) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("hybrid").permanentId,
    instanceId: s.inst("hybridDai").instanceId,
    useAlternateCost: true,
    alternateRequirementIndex: 0,
  });
}

async function digivolveTommyIntoDaiPenmon(s: EngineSetup): Promise<void> {
  await s.ready();
  expect(activateHandMain(s, "dai")).toEqual({ ok: true });
  await settle(() => s.perm("tommy").topCard.cardId === DAIPENMON);
}

describe("BT18-026 DaiPenmon — KB Q&A rulings", () => {
  it("can only activate its [Hand] [Main] effect while the card is in the hand (Q2946)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TOMMY, as: "tommy" },
            { card: DAIPENMON, as: "fieldDai", under: [KUMAMON] },
          ],
          hand: [{ card: DAIPENMON, as: "handDai" }],
          trash: [
            { card: DAIPENMON, as: "trashDai" },
            { card: KUMAMON, as: "kumamon" },
            { card: KORIKAKUMON, as: "korikakumon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(activateHandMain(s, "trashDai").ok).toBe(false);
    expect(activateHandMain(s, "fieldDai").ok).toBe(false);
    expect(s.perm("tommy").topCard.cardId).toBe(TOMMY);
    expect(s.state.memory).toBe(10);

    expect(activateHandMain(s, "handDai")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === DAIPENMON);
    expect(s.perm("tommy").topCard.instanceId).toBe(s.inst("handDai").instanceId);
  });

  it("cannot activate by placing only 1 of [Kumamon] or [Korikakumon] under the Tamer (Q2947)", async () => {
    for (const lone of [KUMAMON, KORIKAKUMON]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: TOMMY, as: "tommy" }],
            hand: [{ card: DAIPENMON, as: "dai" }],
            trash: [{ card: lone, as: "lone" }],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();

      expect(activateHandMain(s, "dai").ok, `only ${lone} in trash`).toBe(false);
      expect(s.perm("tommy").topCard.cardId).toBe(TOMMY);
      expect(s.perm("tommy").stack).toHaveLength(0);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([lone]);
      expect(s.state.memory).toBe(10);
    }

    const both = setupTommyBoard();
    await digivolveTommyIntoDaiPenmon(both);
    expect(both.perm("tommy").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining([KUMAMON, KORIKAKUMON, TOMMY]),
    );
  });

  it("does not trigger 'when a Digimon digivolves' watchers or obey 'Digimon can't digivolve' when a Tamer digivolves (Q2948)", async () => {
    const watcher = setupTommyBoard({
      extraBattleArea: [
        { card: DAVIS_AND_KEN, as: "davisAndKen" },
        { card: KORIKAKUMON, as: "hybrid" },
      ],
      extraHand: [{ card: DAIPENMON, as: "hybridDai" }],
      acceptOptionalEffects: true,
    });
    await digivolveTommyIntoDaiPenmon(watcher);
    await settle();
    expect(watcher.perm("davisAndKen").isSuspended).toBe(false);
    expect(watcher.state.memory).toBe(7);

    expect(digivolveHybridIntoDaiPenmon(watcher)).toEqual({ ok: true });
    await settle(() => watcher.perm("davisAndKen").isSuspended);
    expect(watcher.state.memory).toBe(5);

    const locked = setupTommyBoard({
      extraBattleArea: [{ card: KORIKAKUMON, as: "hybrid" }],
      extraHand: [{ card: DAIPENMON, as: "hybridDai" }],
      breeding: { card: KING_DRASIL_7D6, as: "kingDrasil" },
    });
    await locked.ready();
    expect(digivolveHybridIntoDaiPenmon(locked).ok).toBe(false);
    expect(locked.perm("hybrid").topCard.cardId).toBe(KORIKAKUMON);

    await digivolveTommyIntoDaiPenmon(locked);
    expect(locked.perm("tommy").topCard.instanceId).toBe(locked.inst("dai").instanceId);
    expect(locked.state.memory).toBe(7);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q2949)", async () => {
    const s = setupTommyBoard();
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([DAIPENMON]);

    await digivolveTommyIntoDaiPenmon(s);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.memory).toBe(7);
  });

  it("cannot attack the turn it digivolves from a Tamer played that same turn (Q2950)", async () => {
    const fresh = setupTommyBoard({ tommyEnteredThisTurn: true });
    await digivolveTommyIntoDaiPenmon(fresh);
    expect(
      fresh.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fresh.perm("tommy").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(fresh.perm("tommy").isSuspended).toBe(false);

    const established = setupTommyBoard({ tommyEnteredThisTurn: false });
    await digivolveTommyIntoDaiPenmon(established);
    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("tommy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("treats the Tamer under it as a digivolution card that is trashed when it leaves the field (Q6602)", async () => {
    const s = setupTommyBoard();
    await digivolveTommyIntoDaiPenmon(s);
    const tommyCard = s.perm("tommy").stack.find(({ cardId }) => cardId === TOMMY);
    expect(tommyCard).toBeDefined();
    const permanentId = s.perm("tommy").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(1);
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        tommyCard!.instanceId,
        s.inst("kumamon").instanceId,
        s.inst("korikakumon").instanceId,
        s.inst("dai").instanceId,
      ]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6603)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: DAIPENMON, as: "dai", under: [{ card: TOMMY, as: "buriedTommy" }] }],
          security: [{ card: TOMMY, as: "securityTommy" }],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER], security: 3 },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const tommyTriggersFrom = (instanceId: string) =>
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === TOMMY && event.sourceInstanceId === instanceId,
      );

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("dai"));
    await settle();

    expect(tommyTriggersFrom(s.inst("buriedTommy").instanceId)).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("dai").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("buriedTommy").instanceId]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTommy"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(tommyTriggersFrom(s.inst("securityTommy").instanceId)).not.toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("securityTommy").instanceId,
    );
    expect(s.perm("dai").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("buriedTommy").instanceId]);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6604)", async () => {
    const attackWith = async (source: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: DAIPENMON, as: "dai", under: [source] }],
            deck: [{ card: "BT1-010", as: "drawn" }, ...FILLER],
            security: 3,
          },
          1: {
            battleArea: [{ card: "BT1-013", as: "enemy", under: [{ card: "BT1-009", as: "enemySource" }] }],
            deck: [...FILLER],
            security: 3,
          },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("dai").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      return s;
    };

    const withTommy = await attackWith(TOMMY);
    expect(withTommy.perm("enemy").stack).toHaveLength(0);
    expect(withTommy.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      withTommy.inst("enemySource").instanceId,
    );
    expect(withTommy.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      withTommy.inst("drawn").instanceId,
    );

    const withoutTommy = await attackWith("BT1-009");
    expect(withoutTommy.perm("enemy").stack.map(({ instanceId }) => instanceId)).toEqual([
      withoutTommy.inst("enemySource").instanceId,
    ]);
    expect(withoutTommy.state.players[0]!.hand).toHaveLength(0);
  });
});

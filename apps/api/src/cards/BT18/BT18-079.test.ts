import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  assertNoLoudGap,
  drainMicrotasks,
  setupEngine,
  settle,
  type EngineSetup,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT13/BT13-007.js";
import "../BT5/BT5-091.js";
import "../BT7/BT7-091.js";
import { compiled } from "./BT18-079.js";

describe("BT18-079 Velgrmon", () => {
  it("matches the catalog and full IR color scaling, end-of-attack, and alternate-route contract", () => {
    expect(getCardDefinition("BT18-079")).toMatchObject({
      cardId: "BT18-079",
      nameEn: "Velgrmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 4 }],
      forms: ["Hybrid"],
      attributes: ["Variable"],
      types: ["Giant Bird"],
      inheritedEffectText: "＜Retaliation＞.",
    });
    expect(compiled).toMatchObject({
      effects: [
        ...(["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "TrashTopDeck",
              controller: "both",
              amount: 1,
              scaling: {
                per: 1,
                filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
                unit: "colors",
              },
              trackCount: "trashedThisEffect",
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "forTheTurn",
              scaling: { per: 1, unit: "namedCount", countSource: "trashedThisEffect" },
            },
          ],
        })),
        {
          trigger: "EndOfAttack",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" },
                count: "all",
              },
              cost: { kind: "deleteOwn" },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
        { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Retaliation" }] },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Koichi Kimura"], cost: 3, isAlternate: true },
        { names: ["Duskmon"], cost: 1, isAlternate: true },
      ],
    });
  });

  it("naturally plays and trashes one card per distinct opposing color from both decks", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-079", as: "velgr" }], deck: ["BT1-010", "BT1-010", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "redDigimon" },
            { card: "BT1-032", as: "blueDigimon" },
            { card: "BT9-084", as: "redYellowTamer" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("velgr").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[1]!.deck.length === 0);

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.perm("velgr").currentDP).toBe(13000);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally evolves from a legal purple level-3 peer and resolves the same scaling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-075", as: "base" }],
          hand: [{ card: "BT18-079", as: "velgr" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "redDigimon" },
            { card: "BT1-032", as: "blueDigimon" },
            { card: "BT9-084", as: "redYellowTamer" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("velgr").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-079" && s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.perm("base").currentDP).toBe(13000);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally resolves End of Attack by deleting a legal own cost and all lowest-level opponents", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-077", as: "sacrifice" },
            { card: "BT18-079", as: "velgr" },
          ],
        },
        1: {
          security: ["BT1-010"],
          battleArea: [
            { card: "BT1-009", as: "lowOne" },
            { card: "BT1-010", as: "lowTwo" },
            { card: "BT1-032", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").topCard!.instanceId);
    s.state.memory = 3;
    const sacrificeId = s.perm("sacrifice").permanentId;
    const lowOneId = s.perm("lowOne").permanentId;
    const lowTwoId = s.perm("lowTwo").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("velgr").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== sacrificeId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-079")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowOneId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowTwoId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-032")).toBe(true);
    assertNoLoudGap(s);
  });

  it("naturally applies inherited Retaliation from a legal Velgrmon-under-Oboromon stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-080", as: "host", dp: 5000, suspended: true, under: ["BT18-079"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT18-079"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT18-079 Velgrmon — KB Q&A rulings", () => {
  const deckFillers = ["BT1-010", "BT1-010", "BT1-010"];

  function digivolveKoichiIntoVelgrmon(s: EngineSetup): ReturnType<EngineSetup["engine"]["applyIntent"]> {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("koichi").permanentId,
      instanceId: s.inst("velgr").instanceId,
      useAlternateCost: true,
      alternateRequirementIndex: 1,
    });
  }

  function digivolveDemiDevimonIntoVelgrmon(s: EngineSetup): ReturnType<EngineSetup["engine"]["applyIntent"]> {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("demiDevimon").permanentId,
      instanceId: s.inst("velgr").instanceId,
    });
  }

  it("digivolves the Tamer as-is: skips 'when a Digimon digivolves' watchers and ignores 'Digimon can't digivolve' (Q3034)", async () => {
    const watcherBoard = (base: "koichi" | "demiDevimon") =>
      setupEngine(
        {
          0: {
            battleArea: [
              base === "koichi" ? { card: "BT7-091", as: "koichi" } : { card: "BT2-067", as: "demiDevimon" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [{ card: "BT18-079", as: "velgr" }],
            deck: deckFillers,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const fromTamer = watcherBoard("koichi");
    await fromTamer.ready();
    fromTamer.state.memory = 4;
    expect(digivolveKoichiIntoVelgrmon(fromTamer)).toEqual({ ok: true });
    await settle(
      () => fromTamer.perm("koichi").topCard?.cardId === "BT18-079" && fromTamer.state.pendingDecision === undefined,
    );
    await drainMicrotasks();
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);
    // Only the digivolution bonus draw: Takumi's <Draw 1> never ran.
    expect(fromTamer.state.players[0]!.hand).toHaveLength(1);

    const fromDigimon = watcherBoard("demiDevimon");
    await fromDigimon.ready();
    fromDigimon.state.memory = 4;
    expect(digivolveDemiDevimonIntoVelgrmon(fromDigimon)).toEqual({ ok: true });
    await settle(() => fromDigimon.perm("takumi").isSuspended && fromDigimon.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(fromDigimon.perm("takumi").isSuspended).toBe(true);
    expect(fromDigimon.state.players[0]!.hand).toHaveLength(2);

    const lockedBoard = () =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT7-091", as: "koichi" },
              { card: "BT2-067", as: "demiDevimon" },
            ],
            breeding: { card: "BT13-007", as: "kingDrasil" },
            hand: [{ card: "BT18-079", as: "velgr" }],
            deck: deckFillers,
          },
        },
        { autoSelectCards: true },
      );

    const lockedDigimon = lockedBoard();
    await lockedDigimon.ready();
    lockedDigimon.state.memory = 4;
    expect(digivolveDemiDevimonIntoVelgrmon(lockedDigimon).ok).toBe(false);
    expect(lockedDigimon.perm("demiDevimon").topCard?.cardId).toBe("BT2-067");

    const lockedTamer = lockedBoard();
    await lockedTamer.ready();
    lockedTamer.state.memory = 4;
    expect(digivolveKoichiIntoVelgrmon(lockedTamer)).toEqual({ ok: true });
    await settle(() => lockedTamer.perm("koichi").topCard?.cardId === "BT18-079");
    expect(lockedTamer.perm("koichi").stack.map(({ cardId }) => cardId)).toEqual(["BT7-091"]);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves into it (Q3035)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-079", as: "velgr" }],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(digivolveKoichiIntoVelgrmon(s)).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-079" && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("cannot attack the turn it digivolves from a Tamer that was played this turn (Q3036)", async () => {
    const attackWith = (s: EngineSetup, permanentId: string) =>
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: permanentId, target: { kind: "player" } });

    const preferred: string[] = [];
    const playedThisTurn = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-091", as: "koichiInHand" },
            { card: "BT18-079", as: "velgr" },
          ],
          deck: [{ card: "BT1-010", as: "koichiDraw" }, "BT1-010", "BT1-010"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await playedThisTurn.ready();
    preferred.push(playedThisTurn.inst("koichiDraw").instanceId);
    playedThisTurn.state.memory = 6;
    const player = playedThisTurn.state.players[0]!;
    const koichiOnField = () =>
      player.battleArea.find(({ topCard, stack }) => [topCard, ...stack].some((card) => card?.cardId === "BT7-091"));

    expect(
      playedThisTurn.engine.applyIntent(0, {
        type: "playCard",
        instanceId: playedThisTurn.inst("koichiInHand").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => koichiOnField() !== undefined && playedThisTurn.state.pendingDecision === undefined);
    expect(player.hand.map(({ instanceId }) => instanceId)).toEqual([playedThisTurn.inst("velgr").instanceId]);

    expect(
      playedThisTurn.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: koichiOnField()!.permanentId,
        instanceId: playedThisTurn.inst("velgr").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => koichiOnField()?.topCard?.cardId === "BT18-079" && playedThisTurn.state.pendingDecision === undefined,
    );
    const velgrmon = koichiOnField()!;
    expect(attackWith(playedThisTurn, velgrmon.permanentId).ok).toBe(false);
    expect(velgrmon.isSuspended).toBe(false);

    const playedEarlier = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-079", as: "velgr" }],
          deck: deckFillers,
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await playedEarlier.ready();
    playedEarlier.state.memory = 3;
    expect(digivolveKoichiIntoVelgrmon(playedEarlier)).toEqual({ ok: true });
    await settle(
      () =>
        playedEarlier.perm("koichi").topCard?.cardId === "BT18-079" &&
        playedEarlier.state.pendingDecision === undefined,
    );
    expect(attackWith(playedEarlier, playedEarlier.perm("koichi").permanentId)).toEqual({ ok: true });
  });

  it("counts 3 colors across an opponent's red/blue Digimon and red/yellow Tamer and trashes 3 from both decks (Q3037)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-079", as: "velgr" }], deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT16-017", as: "redBlueDigimon" },
            { card: "BT9-084", as: "redYellowTamer" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("velgr").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length > 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    // 7000 base + 1000 for each of the 6 cards trashed across both decks.
    expect(s.perm("velgr").currentDP).toBe(13000);
  });

  it("treats the Tamer under it as a digivolution card that is trashed when it leaves the field (Q6659)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-079", as: "velgr" }],
          deck: deckFillers,
        },
        1: { battleArea: [{ card: "BT1-078", as: "wall", dp: 20000, suspended: true }], deck: deckFillers },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    const player = s.state.players[0]!;
    const koichiInstanceId = s.inst("koichi").instanceId;

    expect(digivolveKoichiIntoVelgrmon(s)).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-079" && s.state.pendingDecision === undefined);
    const velgrmonId = s.perm("koichi").permanentId;
    expect(s.perm("koichi").stack.map(({ instanceId }) => instanceId)).toEqual([koichiInstanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: velgrmonId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some(({ instanceId }) => instanceId === koichiInstanceId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.battleArea).toHaveLength(0);
    expect(player.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("velgr").instanceId, koichiInstanceId]),
    );
  });

  it("does not give the Digimon the [Security] effect in a Tamer digivolution card's lower text (Q6660)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-079", as: "host", under: [{ card: "BT7-091", as: "koichiUnder" }] }],
          security: [{ card: "BT7-091", as: "koichiSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const player = s.state.players[0]!;
    const koichiPermanents = () => player.battleArea.filter(({ topCard }) => topCard?.cardId === "BT7-091");

    expect(observe(s.engine).canUseInheritedEffect(s.perm("host"), "BT7-091")).toBe(true);
    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("host"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("koichiUnder").instanceId]);
    expect(koichiPermanents()).toHaveLength(0);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("koichiSecurity"));
    await settle(() => koichiPermanents().length === 1);
    expect(koichiPermanents()[0]!.topCard?.instanceId).toBe(s.inst("koichiSecurity").instanceId);
  });
  it("gives the Digimon the inherited effect in a Tamer digivolution card's lower text (Q6661)", async () => {
    const memoryAfterBattleDeletion = async (withKoichiUnder: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT18-079",
                as: "velgr",
                under: withKoichiUnder ? [{ card: "BT7-091", as: "koichiUnder" }] : [],
              },
            ],
            deck: deckFillers,
          },
          1: { battleArea: [{ card: "BT1-078", as: "wall", dp: 20000, suspended: true }], deck: deckFillers },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 3;
      const player = s.state.players[0]!;
      const velgrmonInstanceId = s.inst("velgr").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("velgr").permanentId,
          target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => player.trash.some(({ instanceId }) => instanceId === velgrmonInstanceId));
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();

      expect(player.battleArea).toHaveLength(0);
      return s.state.memory;
    };

    expect(await memoryAfterBattleDeletion(true)).toBe(4);
    expect(await memoryAfterBattleDeletion(false)).toBe(3);
  });
});

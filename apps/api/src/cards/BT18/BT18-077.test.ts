import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-060.js";
import "../BT13/BT13-007.js";
import "../BT2/BT2-067.js";
import "../BT5/BT5-091.js";
import "../BT7/BT7-091.js";
import "./BT18-076.js";
import "./BT18-094.js";
import { compiled } from "./BT18-077.js";

describe("BT18-077 KaiserLeomon", () => {
  it("matches the catalog and full IR deletion, Retaliation, and alternate-route contract", () => {
    expect(getCardDefinition("BT18-077")).toMatchObject({
      cardId: "BT18-077",
      nameEn: "KaiserLeomon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 4 },
        { color: "Yellow", level: 3, memoryCost: 4 },
      ],
      forms: ["Hybrid"],
      attributes: ["Variable"],
      types: ["Cyborg"],
      inheritedEffectText: "＜Retaliation＞.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }] },
        ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
                count: 1,
              },
            },
          ],
        })),
        { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Retaliation" }] },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Koichi Kimura"], cost: 3, isAlternate: true },
        { names: ["Loweemon"], cost: 1, isAlternate: true },
      ],
    });
  });

  it("naturally plays for 6 and deletes exactly one opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-077", as: "kaiser" }] },
        1: {
          battleArea: [
            { card: "BT1-032", as: "target" },
            { card: "BT1-060", as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kaiser").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-032"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-032")).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-032")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-060")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally resolves the same level boundary from When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-075", as: "base" }], hand: [{ card: "BT18-077", as: "kaiser" }] },
        1: {
          battleArea: [
            { card: "BT1-032", as: "target" },
            { card: "BT1-060", as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kaiser").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-077");

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-032")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-060")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally uses printed Retaliation when KaiserLeomon loses a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-077", as: "kaiser", dp: 5000, suspended: true }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const kaiserId = s.perm("kaiser").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: kaiserId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT18-077"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === kaiserId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT18-077 KaiserLeomon — KB Q&A rulings", () => {
  const deckFillers = ["BT1-010", "BT1-010", "BT1-010"];

  function digivolveKoichiIntoKaiserLeomon(s: EngineSetup): ReturnType<EngineSetup["engine"]["applyIntent"]> {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("koichi").permanentId,
      instanceId: s.inst("kaiser").instanceId,
      useAlternateCost: true,
    });
  }

  function digivolveDigimonIntoKaiserLeomon(s: EngineSetup): ReturnType<EngineSetup["engine"]["applyIntent"]> {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("demiDevimon").permanentId,
      instanceId: s.inst("kaiser").instanceId,
    });
  }

  it("does not trigger Digimon-digivolve watchers when a Tamer digivolves, and ignores 'Digimon can't digivolve' (Q3023)", async () => {
    const watcherBoard = (base: "koichi" | "demiDevimon") =>
      setupEngine(
        {
          0: {
            battleArea: [
              base === "koichi" ? { card: "BT7-091", as: "koichi" } : { card: "BT2-067", as: "demiDevimon" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [{ card: "BT18-077", as: "kaiser" }],
            deck: deckFillers,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const fromTamer = watcherBoard("koichi");
    await fromTamer.ready();
    fromTamer.state.memory = 3;
    expect(digivolveKoichiIntoKaiserLeomon(fromTamer)).toEqual({ ok: true });
    await settle(() => fromTamer.perm("koichi").topCard?.cardId === "BT18-077");
    await settle(() => fromTamer.state.pendingDecision === undefined);
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);

    const fromDigimon = watcherBoard("demiDevimon");
    await fromDigimon.ready();
    fromDigimon.state.memory = 4;
    expect(digivolveDigimonIntoKaiserLeomon(fromDigimon)).toEqual({ ok: true });
    await settle(() => fromDigimon.perm("takumi").isSuspended && fromDigimon.state.pendingDecision === undefined);
    expect(fromDigimon.perm("takumi").isSuspended).toBe(true);

    const lockedBoard = () =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT7-091", as: "koichi" },
              { card: "BT2-067", as: "demiDevimon" },
            ],
            breeding: { card: "BT13-007", as: "kingDrasil" },
            hand: [{ card: "BT18-077", as: "kaiser" }],
            deck: deckFillers,
          },
        },
        { autoSelectCards: true },
      );

    const lockedDigimon = lockedBoard();
    await lockedDigimon.ready();
    lockedDigimon.state.memory = 4;
    expect(digivolveDigimonIntoKaiserLeomon(lockedDigimon).ok).toBe(false);
    expect(lockedDigimon.perm("demiDevimon").topCard?.cardId).toBe("BT2-067");

    const lockedTamer = lockedBoard();
    await lockedTamer.ready();
    lockedTamer.state.memory = 3;
    expect(digivolveKoichiIntoKaiserLeomon(lockedTamer)).toEqual({ ok: true });
    await settle(() => lockedTamer.perm("koichi").topCard?.cardId === "BT18-077");
    expect(lockedTamer.perm("koichi").stack.map(({ cardId }) => cardId)).toContain("BT7-091");
  });

  it("performs the digivolution bonus draw when a Tamer digivolves into it (Q3024)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-077", as: "kaiser" }],
          deck: deckFillers,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const player = s.state.players[0]!;

    expect(digivolveKoichiIntoKaiserLeomon(s)).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-077" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(player.deck).toHaveLength(deckFillers.length - 1);
    expect(player.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
  });

  it("cannot attack the turn it digivolves from a Tamer that was played this turn (Q3025)", async () => {
    const board = (koichiEnteredThisTurn: boolean) =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-091", as: "koichi", enteredThisTurn: koichiEnteredThisTurn }],
            hand: [{ card: "BT18-077", as: "kaiser" }],
            deck: deckFillers,
          },
          1: { security: ["BT1-010"] },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
    const attackWithKaiserLeomon = async (s: EngineSetup) => {
      await s.ready();
      s.state.memory = 3;
      expect(digivolveKoichiIntoKaiserLeomon(s)).toEqual({ ok: true });
      await settle(() => s.perm("koichi").topCard?.cardId === "BT18-077" && s.state.pendingDecision === undefined);
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koichi").permanentId,
        target: { kind: "player" },
      });
    };

    const playedThisTurn = board(true);
    expect((await attackWithKaiserLeomon(playedThisTurn)).ok).toBe(false);
    expect(playedThisTurn.perm("koichi").isSuspended).toBe(false);

    const playedEarlier = board(false);
    expect(await attackWithKaiserLeomon(playedEarlier)).toEqual({ ok: true });
    await settle(() => playedEarlier.state.players[1]!.security.length === 0);
    expect(playedEarlier.perm("koichi").isSuspended).toBe(true);
  });

  it("treats the Tamer under it as a digivolution card that is trashed with it (Q6653)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-077", as: "kaiser" }],
          deck: deckFillers,
        },
        1: { battleArea: [{ card: "BT1-060", as: "defender", dp: 9000, suspended: true }], security: 1 },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    const player = s.state.players[0]!;
    const koichiInstanceId = s.inst("koichi").instanceId;

    expect(digivolveKoichiIntoKaiserLeomon(s)).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-077" && s.state.pendingDecision === undefined);
    const kaiserLeomonId = s.perm("koichi").permanentId;
    expect(s.perm("koichi").stack.map(({ instanceId }) => instanceId)).toEqual([koichiInstanceId]);
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: kaiserLeomonId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some(({ instanceId }) => instanceId === koichiInstanceId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.battleArea.some(({ permanentId }) => permanentId === kaiserLeomonId)).toBe(false);
    expect(player.battleArea.some(({ topCard }) => topCard?.instanceId === koichiInstanceId)).toBe(false);
    expect(player.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT18-077", "BT7-091"]));
    // Koichi's inherited [On Deletion] resolves only because it left the field as a digivolution card.
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-091")).toBe(true);
    expect(s.state.memory).toBe(8);
  });

  it("does not give the Digimon the [Security] effect in a Tamer digivolution card's lower text (Q6654)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-077",
              as: "host",
              under: [
                { card: "BT7-091", as: "lowerTextKoichi" },
                { card: "BT18-094", as: "koichiUnder" },
              ],
            },
          ],
          security: [{ card: "BT7-091", as: "koichiSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const player = s.state.players[0]!;
    const tamerPermanents = () => player.battleArea.filter(({ topCard }) => topCard?.cardId !== "BT18-077");
    const stackBefore = s.perm("host").stack.map(({ instanceId }) => instanceId);

    expect(observe(s.engine).canUseInheritedEffect(s.perm("host"), "BT7-091")).toBe(true);
    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("host"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual(stackBefore);
    expect(tamerPermanents()).toHaveLength(0);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("koichiSecurity"));
    await settle(() => tamerPermanents().length === 1);
    expect(tamerPermanents()[0]!.topCard?.instanceId).toBe(s.inst("koichiSecurity").instanceId);
  });

  it("gives the Digimon the inherited effect in a Tamer digivolution card's lower text (Q6655)", async () => {
    const attackAndReadHand = async (tamerUnder: boolean): Promise<string[]> => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-077", as: "host", under: tamerUnder ? ["BT18-094"] : [] }],
            trash: [{ card: "BT18-076", as: "loweemon" }],
          },
          1: { security: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
      return s.state.players[0]!.hand.map(({ cardId }) => cardId);
    };

    expect(await attackAndReadHand(true)).toContain("BT18-076");
    expect(await attackAndReadHand(false)).not.toContain("BT18-076");
  });
});

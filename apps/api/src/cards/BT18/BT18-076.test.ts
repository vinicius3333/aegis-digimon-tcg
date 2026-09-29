import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-035.js";
import "../BT13/BT13-007.js";
import "../BT2/BT2-067.js";
import "../BT5/BT5-091.js";
import "../BT7/BT7-091.js";
import "./BT18-094.js";
import { compiled } from "./BT18-076.js";

describe("BT18-076 Loweemon", () => {
  it("matches the catalog and full IR digivolution, attack, inherited, and alternate-route contract", () => {
    expect(getCardDefinition("BT18-076")).toMatchObject({
      cardId: "BT18-076",
      nameEn: "Loweemon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Hybrid"],
      attributes: ["Variable"],
      types: ["Warrior"],
      inheritedEffectText:
        "[All Turns] When this Digimon would leave the battle area other than by your effects, you may play 1 Tamer card with inherited effects from this Digimon's digivolution cards without paying the cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Draw", amount: 1 },
            { kind: "Trash", target: { filter: { zone: "hand" }, count: 1 } },
          ],
        },
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 },
              into: { kind: ["Digimon"], colors: ["Yellow", "Purple"] },
              from: ["trash"],
              payCost: true,
              optional: true,
            },
          ],
        },
        {
          trigger: "AllTurns",
          isInherited: true,
          actions: [
            {
              kind: "Replacement",
              event: "wouldLeavePlay",
              leaveCause: "otherThanYourEffect",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "PlayWithoutCost",
                  from: ["digivolutionCards"],
                  fromOwnDigivolutionStack: true,
                  payCost: false,
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Koichi Kimura"], cost: 2, isAlternate: true },
        { names: ["KaiserLeomon"], cost: 0, isAlternate: true },
      ],
    });
  });

  it("naturally draws one and trashes one card when digivolving from a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-075", as: "base" }], hand: [{ card: "BT18-076", as: "lowee" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lowee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-076");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-075");
    assertNoLoudGap(s);
  });

  it("naturally draws one and trashes one card when a Tamer digivolves into Loweemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-076", as: "lowee" }],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koichi").permanentId,
        instanceId: s.inst("lowee").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-076");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    assertNoLoudGap(s);
  });

  it("naturally digivolves a chosen own Tamer into a purple/yellow Hybrid from trash for its printed cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-076", as: "lowee" },
            { card: "BT7-091", as: "koichi" },
          ],
          trash: ["BT18-077"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lowee").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));
    const decision = s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(decision?.kind).toBe("chooseTargets");
    if (decision?.kind !== "chooseTargets") return;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("koichi").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-077");

    expect(s.state.memory).toBe(7);
    expect(s.perm("koichi").stack.map(({ cardId }) => cardId)).toContain("BT7-091");
    assertNoLoudGap(s);
  });

  it("naturally replaces an opponent-caused battle deletion by playing an inherited-effect Tamer from its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-079", as: "host", dp: 5000, suspended: true, under: ["BT18-076", "BT18-094"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094")).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not play an eligible Tamer from another own Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-080", as: "host", dp: 5000, suspended: true, under: ["BT18-076"] },
            { card: "BT18-080", as: "otherHost", under: ["BT18-094", "BT18-076"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT18-080"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094")).toBe(false);
    expect(s.perm("otherHost").stack.map(({ cardId }) => cardId)).toEqual(["BT18-094", "BT18-076"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-080")).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("BT18-076 Loweemon — KB Q&A rulings", () => {
  const takumiSuspended = (s: EngineSetup): boolean => s.perm("takumi").isSuspended;

  function digivolveKoichiIntoLoweemon(s: EngineSetup): ReturnType<EngineSetup["engine"]["applyIntent"]> {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("koichi").permanentId,
      instanceId: s.inst("lowee").instanceId,
      useAlternateCost: true,
      alternateRequirementIndex: 1,
    });
  }

  function digivolveDigimonIntoLoweemon(s: EngineSetup): ReturnType<EngineSetup["engine"]["applyIntent"]> {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("demiDevimon").permanentId,
      instanceId: s.inst("lowee").instanceId,
    });
  }

  const deckFillers = ["BT1-010", "BT1-010", "BT1-010"];

  it("does not trigger Digimon-digivolve watchers when a Tamer digivolves, and ignores 'Digimon can't digivolve' (Q3020)", async () => {
    const watcherBoard = (base: "koichi" | "demiDevimon") =>
      setupEngine(
        {
          0: {
            battleArea: [
              base === "koichi" ? { card: "BT7-091", as: "koichi" } : { card: "BT2-067", as: "demiDevimon" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [{ card: "BT18-076", as: "lowee" }],
            deck: deckFillers,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const fromTamer = watcherBoard("koichi");
    await fromTamer.ready();
    fromTamer.state.memory = 3;
    expect(digivolveKoichiIntoLoweemon(fromTamer)).toEqual({ ok: true });
    await settle(() => fromTamer.perm("koichi").topCard?.cardId === "BT18-076");
    await settle(() => fromTamer.state.pendingDecision === undefined);
    expect(takumiSuspended(fromTamer)).toBe(false);

    const fromDigimon = watcherBoard("demiDevimon");
    await fromDigimon.ready();
    fromDigimon.state.memory = 3;
    expect(digivolveDigimonIntoLoweemon(fromDigimon)).toEqual({ ok: true });
    await settle(() => takumiSuspended(fromDigimon) && fromDigimon.state.pendingDecision === undefined);
    expect(takumiSuspended(fromDigimon)).toBe(true);

    const lockedBoard = () =>
      setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT7-091", as: "koichi" },
              { card: "BT2-067", as: "demiDevimon" },
            ],
            breeding: { card: "BT13-007", as: "kingDrasil" },
            hand: [{ card: "BT18-076", as: "lowee" }],
            deck: deckFillers,
          },
        },
        { autoSelectCards: true },
      );

    const lockedDigimon = lockedBoard();
    await lockedDigimon.ready();
    lockedDigimon.state.memory = 3;
    expect(digivolveDigimonIntoLoweemon(lockedDigimon).ok).toBe(false);
    expect(lockedDigimon.perm("demiDevimon").topCard?.cardId).toBe("BT2-067");

    const lockedTamer = lockedBoard();
    await lockedTamer.ready();
    lockedTamer.state.memory = 3;
    expect(digivolveKoichiIntoLoweemon(lockedTamer)).toEqual({ ok: true });
    await settle(() => lockedTamer.perm("koichi").topCard?.cardId === "BT18-076");
    expect(lockedTamer.perm("koichi").stack.map(({ cardId }) => cardId)).toContain("BT7-091");
  });

  it("lets the player order the deleted Digimon's [On Deletion] and the played Tamer's [On Play] (Q3021)", async () => {
    const resolutionOrder = async (preferredFirst: string): Promise<string[]> => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-035", as: "host", suspended: true, under: ["BT18-076", "BT7-091"] }],
            deck: deckFillers,
          },
          1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [preferredFirst] },
      );
      s.state.turnSeat = 1;
      await s.ready();

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("host").permanentId },
        }),
      ).toEqual({ ok: true });
      const resolvedSources = () =>
        s.events.flatMap((event) =>
          event.kind === "effectResolved" && ["BT1-035", "BT7-091"].includes(event.sourceCardId)
            ? [event.sourceCardId]
            : [],
        );
      await settle(() => resolvedSources().length === 2 && s.state.pendingDecision === undefined);

      const offered = s.decisions.find(
        ({ req }) =>
          req.kind === "orderTriggers" &&
          (req.options?.triggerCardIds ?? []).includes("BT1-035") &&
          (req.options?.triggerCardIds ?? []).includes("BT7-091"),
      );
      expect(offered?.seat).toBe(0);
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT7-091")).toBe(true);
      return resolvedSources();
    };

    expect(await resolutionOrder("BT1-035")).toEqual(["BT1-035", "BT7-091"]);
    expect(await resolutionOrder("BT7-091")).toEqual(["BT7-091", "BT1-035"]);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves into it (Q3022)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-076", as: "lowee" }],
          deck: deckFillers,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const player = s.state.players[0]!;

    expect(digivolveKoichiIntoLoweemon(s)).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-076");
    await settle(() => s.state.pendingDecision === undefined && player.trash.length === 1);

    // One card for the bonus draw plus one for Loweemon's own [When Digivolving] <Draw 1>.
    expect(player.deck).toHaveLength(deckFillers.length - 2);
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer that was played this turn (Q6649)", async () => {
    const board = (koichiEnteredThisTurn: boolean) =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-091", as: "koichi", enteredThisTurn: koichiEnteredThisTurn }],
            hand: [{ card: "BT18-076", as: "lowee" }],
            deck: deckFillers,
          },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
    const attackWithLoweemon = async (s: EngineSetup) => {
      await s.ready();
      s.state.memory = 2;
      expect(digivolveKoichiIntoLoweemon(s)).toEqual({ ok: true });
      await settle(() => s.perm("koichi").topCard?.cardId === "BT18-076" && s.state.pendingDecision === undefined);
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koichi").permanentId,
        target: { kind: "player" },
      });
    };

    const playedThisTurn = board(true);
    expect((await attackWithLoweemon(playedThisTurn)).ok).toBe(false);
    expect(playedThisTurn.perm("koichi").isSuspended).toBe(false);

    const playedEarlier = board(false);
    expect(await attackWithLoweemon(playedEarlier)).toEqual({ ok: true });
  });

  it("treats the Tamer under it as a digivolution card that is trashed with it (Q6650)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-091", as: "koichi" }],
          hand: [{ card: "BT18-076", as: "lowee" }],
          deck: deckFillers,
        },
        1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 7000, suspended: true }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    const player = s.state.players[0]!;
    const koichiInstanceId = s.inst("koichi").instanceId;

    expect(digivolveKoichiIntoLoweemon(s)).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-076" && s.state.pendingDecision === undefined);
    const loweemonId = s.perm("koichi").permanentId;
    expect(s.perm("koichi").stack.map(({ instanceId }) => instanceId)).toEqual([koichiInstanceId]);
    expect(s.state.memory).toBe(8);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: loweemonId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some(({ instanceId }) => instanceId === koichiInstanceId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(player.battleArea.some(({ permanentId }) => permanentId === loweemonId)).toBe(false);
    expect(player.battleArea.some(({ topCard }) => topCard?.instanceId === koichiInstanceId)).toBe(false);
    expect(player.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT18-076", "BT7-091"]));
    // Koichi's inherited [On Deletion] resolves because it left the field as a digivolution card.
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-091")).toBe(true);
    expect(s.state.memory).toBe(9);
  });

  it("does not give the Digimon the [Security] effect in a Tamer digivolution card's lower text (Q6651)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-076", as: "host", under: [{ card: "BT7-091", as: "koichiUnder" }] }],
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

  it("gives the Digimon the inherited effect in a Tamer digivolution card's lower text (Q6652)", async () => {
    const attackAndReadHand = async (tamerUnder: boolean): Promise<string[]> => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-010", as: "host", under: tamerUnder ? ["BT18-094"] : [] }],
            trash: [{ card: "BT18-077", as: "kaiserLeomon" }],
          },
          1: { security: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const player = s.state.players[0]!;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
      return player.hand.map(({ cardId }) => cardId);
    };

    expect(await attackAndReadHand(true)).toContain("BT18-077");
    expect(await attackAndReadHand(false)).not.toContain("BT18-077");
  });
});

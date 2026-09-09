import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-064.js";

/**
 * BT19-064 Justimon: Blitz Arm ACE (Black, Lv.6, Vaccine, Cyborg, 11000 DP, play cost 6,
 * Overflow ＜-4＞).
 *
 * [Digivolve] [Justimon: Accel Arm]/[Justimon: Critical Arm]: Cost 1
 * [Hand] [Counter] ＜Blast Digivolve＞
 * [On Play] [When Digivolving] This Digimon gains ＜Blocker＞ and isn't affected by your
 *   opponent's Digimon's effects until the end of your opponent's turn.
 * [When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 Option card in the battle
 *   area, unsuspend this Digimon.
 *
 * Everything is driven through public intents and the real production turn loop: the opponent's
 * turn is reached with `startTurnLoop`, never by assigning `turnSeat`.
 */

const FILLER = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

async function stopLoop(s: Setup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT19-064 Justimon: Blitz Arm", () => {
  it("matches the catalog print and compiles the four printed clauses onto their printed timings", () => {
    expect(getCardDefinition("BT19-064")).toMatchObject({
      cardId: "BT19-064",
      nameEn: "Justimon: Blitz Arm",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 6,
      dp: 11000,
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      isAce: true,
      overflowMemory: 4,
    });
    const text = getCardDefinition("BT19-064")!.effectText!.replaceAll(" ", " ");
    expect(text).toContain("[Digivolve][Justimon: Accel Arm]/[Justimon: Critical Arm]: Cost 1");
    expect(text).toContain("[Hand] [Counter] ＜Blast Digivolve＞");
    expect(text).toContain(
      "[On Play] [When Digivolving] This Digimon gains ＜Blocker＞and isn't affected by your opponent's Digimon's effects until the end of your opponent's turn.",
    );
    expect(text).toContain(
      "[When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 Option card in the battle area, unsuspend this Digimon.",
    );

    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual([
      "Counter",
      "OnPlay",
      "WhenDigivolving",
      "WhenDigivolving",
      "WhenAttacking",
    ]);
    // The printed route names two EXACT cards; `names` would be the "[X] in its name" substring gate.
    expect(digivolutionRequirementsFor("BT19-064")).toMatchObject([
      { namesExact: ["Justimon: Accel Arm", "Justimon: Critical Arm"], cost: 1, isAlternate: true },
    ]);
    for (const index of [1, 2]) {
      expect(compiled.effects?.[index]?.actions).toMatchObject([
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
        {
          kind: "Restrict",
          restriction: "beAffected",
          duration: "untilOpponentTurnEnd",
          // "your opponent's DIGIMON's effects" — narrower than "your opponent's effects".
          fromSourceKind: ["Digimon"],
          byOpponentEffectsOnly: true,
        },
      ]);
    }
    // One [Once Per Turn] shared between the two printed timings.
    for (const index of [3, 4]) {
      expect(compiled.effects?.[index]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Unsuspend",
            optional: true,
            target: { filter: { isSelfRef: true }, isSelf: true },
            cost: {
              kind: "trash",
              target: {
                // KB Q3126/Q3127: an Option card put on the battle area by a
                // "place this card in the battle area" effect, on EITHER player's side.
                filter: {
                  zone: "battleArea",
                  controllerDefault: "any",
                  kind: ["Option"],
                  placedInBattleAreaByEffect: true,
                },
                count: 1,
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects?.[0]).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
  });

  // --- [Digivolve] alternate route --------------------------------------------------------

  it.each([
    ["BT11-073", "Justimon: Accel Arm"],
    ["BT10-067", "Justimon: Critical Arm"],
  ])("digivolves from %s (%s) for the printed Cost 1", async (baseCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-064");

    // 10 - 1: the alternate route, not the printed Black Lv.5 route's 3.
    expect(s.state.memory).toBe(9);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length - 1);
    assertNoLoudGap(s);
  });

  it("falls back to the normal Black Lv.5 route (cost 3) when the base is not one of the two named cards", async () => {
    // `useAlternateCost: true` with no matching alternate silently uses the normal route, so the
    // memory delta — not `{ok:true}` — is what discriminates the two routes.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-063", as: "base" }],
          hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-064");

    expect(s.state.memory).toBe(7);
  });

  it("refuses illegal sources: a Lv.6 [Justimon (X Antibody)] and a Red Lv.4 both fail every route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX8-054", as: "xAntibody" },
          { card: "BT1-014", as: "redLv4" },
        ],
        hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["xAntibody", "redLv4"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("justi").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
    }
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-064")).toBe(true);
  });

  // --- [Hand] [Counter] ＜Blast Digivolve＞ -------------------------------------------------

  it("＜Blast Digivolve＞ digivolves from hand in the opponent's real counter window for no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-073", as: "base" }],
          hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "attacker" }],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    // Without the counter window the card cannot be digivolved on the opponent's turn at all.
    closeMain(s, 0);
    await openMain(s, 1);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
      }),
    ).toEqual({ ok: false, reason: "not-your-turn" });

    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined || s.perm("attacker").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-064");

    expect(s.perm("base").topCard?.cardId).toBe("BT19-064");
    // ＜Blast Digivolve＞ waives the digivolution cost entirely.
    expect(s.state.memory).toBe(memoryBefore);
    await stopLoop(s, loop, 1);
    assertNoLoudGap(s);
  });

  // --- [When Digivolving] ＜Blocker＞ + immunity --------------------------------------------

  /** Seat 0 digivolves Justimon onto an Accel Arm base inside a real turn loop, then hands over. */
  // Returns the running loop WRAPPED: an async function that returned it directly would await
  // the whole turn loop instead of handing it back.
  async function digivolveInsideLoop(s: Setup): Promise<{ loop: Promise<void> }> {
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-064");
    return { loop };
  }

  function immunityBoard() {
    return {
      0: {
        battleArea: [
          { card: "BT11-073", as: "base" },
          // A peer with no grant: the comparative control for both halves of the clause.
          { card: "BT1-013", as: "peer" },
        ],
        hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: {
        hand: [{ card: "BT1-055", as: "angemon" }, "BT1-013"],
        deck: [...FILLER],
        security: [...SECURITY],
      },
    };
  }

  /**
   * The opponent's Main phase auto-passes as soon as they have no legal action left, so a
   * "for the turn" / "until the end of your opponent's turn" value read after `settle` is already
   * expired. `onEvent` reads the board inside the engine's own call stack, at the instant the
   * opposing effect finishes resolving.
   */
  interface ResolutionSnapshot {
    baseDP: number;
    peerDP: number;
    baseHasBlocker: boolean;
    baseImmune: boolean;
  }

  it("[When Digivolving] grants ＜Blocker＞ and immunity, and an opposing DIGIMON effect aimed at it does nothing", async () => {
    // The restriction is applied when the effect RESOLVES, not at targeting: the immune Digimon is
    // still offered as a candidate, so `preferInstanceIds` pins the opposing Angemon's -3000 DP
    // onto it and the assertion is that the board does not move.
    const preferred: string[] = [];
    const snapshots: ResolutionSnapshot[] = [];
    let s!: Setup;
    s = setupEngine(immunityBoard(), {
      autoDeclineOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
      onEvent: (event) => {
        if (event.kind !== "effectResolved") return;
        snapshots.push({
          baseDP: s.perm("base").currentDP,
          peerDP: s.perm("peer").currentDP,
          baseHasBlocker: observe(s.engine).hasKeyword(s.perm("base"), "Blocker"),
          baseImmune: observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon"),
        });
      },
    });
    await s.ready();
    const { loop } = await digivolveInsideLoop(s);

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("peer"), "beAffected", "Digimon")).toBe(false);
    preferred.push(s.perm("base").permanentId);
    snapshots.length = 0;

    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => snapshots.length > 0);

    // At the instant the opposing Angemon's [On Play] finished: nothing moved, and both halves of
    // the printed clause were still live on the immune Digimon.
    expect(snapshots.at(-1)).toEqual({
      baseDP: 11_000,
      peerDP: 5000,
      baseHasBlocker: true,
      baseImmune: true,
    });

    // Both grants expire once that opponent turn ends.
    await openMain(s, 0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon")).toBe(false);

    await stopLoop(s, loop, 0);
    assertNoLoudGap(s);
  });

  it("the same opposing Digimon effect lands in full on the unprotected peer", async () => {
    const preferred: string[] = [];
    const snapshots: ResolutionSnapshot[] = [];
    let s!: Setup;
    s = setupEngine(immunityBoard(), {
      autoDeclineOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
      onEvent: (event) => {
        if (event.kind !== "effectResolved") return;
        snapshots.push({
          baseDP: s.perm("base").currentDP,
          peerDP: s.perm("peer").currentDP,
          baseHasBlocker: observe(s.engine).hasKeyword(s.perm("base"), "Blocker"),
          baseImmune: observe(s.engine).isRestrictedByEffect(s.perm("base"), "beAffected", "Digimon"),
        });
      },
    });
    await s.ready();
    const { loop } = await digivolveInsideLoop(s);
    preferred.push(s.perm("peer").permanentId);
    snapshots.length = 0;

    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => snapshots.length > 0);

    // The identical effect, pinned to the peer, takes its full 3000 DP — so the immune reading
    // above is the printed protection, not a dead effect.
    expect(snapshots.at(-1)).toEqual({
      baseDP: 11_000,
      peerDP: 2000,
      baseHasBlocker: true,
      baseImmune: true,
    });
    await stopLoop(s, loop, 1);
    assertNoLoudGap(s);
  });

  it("the granted ＜Blocker＞ really blocks: it takes an opponent's attack aimed at the player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-073", as: "base" }],
          hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "attacker", dp: 3000 }],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const { loop } = await digivolveInsideLoop(s);
    closeMain(s, 0);
    await openMain(s, 1);

    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined || s.perm("attacker").isSuspended, 200);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("base").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // The 11000 DP blocker suspended itself, ate the attack and deleted the 3000 DP attacker;
    // security never lost a card.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.perm("base").isSuspended).toBe(true);
    await stopLoop(s, loop, 1);
    assertNoLoudGap(s);
  });

  // --- [When Digivolving] [When Attacking] [Once Per Turn] unsuspend -----------------------

  it("trashes the OPPONENT's placed Option to unsuspend itself (Q3127)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-073", as: "base", suspended: true }],
          hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT16-094", as: "theirOption" }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("base").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("theirOption").instanceId));

    expect(s.perm("base").topCard?.cardId).toBe("BT19-064");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("theirOption").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("[Once Per Turn] is shared: [When Digivolving] spends it and the same turn's [When Attacking] cannot pay again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-073", as: "base", suspended: true },
            { card: "BT16-094", as: "optionOne" },
            { card: "BT16-094", as: "optionTwo" },
          ],
          hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.perm("base").isSuspended).toBe(false);
    const spentOption = s.state.players[0]!.trash.map((card) => card.instanceId);

    // [When Attacking] the same turn: the shared use is gone, so no second Option is trashed and
    // the attacker stays suspended after its attack.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 1);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(spentOption);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT16-094")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("[When Attacking] unsuspends for a second attack, then refuses a third, and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-064", as: "justi", under: [{ card: "BT11-073", as: "accel" }] },
            { card: "BT16-094", as: "optionOne" },
            { card: "BT16-094", as: "optionTwo" },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER], hand: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    // Attack 1: the [When Attacking] cost pays an Option and unsuspends the attacker, so it may
    // attack again this turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justi").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.perm("justi").isSuspended).toBe(false);

    // Attack 2: the once-per-turn use is spent, so the second Option survives and it stays suspended.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justi").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("justi").isSuspended).toBe(true);

    // The next own turn through the real loop resets the use and the second Option pays.
    closeMain(s, 0);
    await openMain(s, 1);
    closeMain(s, 1);
    await openMain(s, 0);
    expect(s.perm("justi").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justi").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT16-094")).toHaveLength(0);
    expect(s.perm("justi").isSuspended).toBe(false);

    await stopLoop(s, loop, 0);
    assertNoLoudGap(s);
  });

  // --- ACE Overflow ＜-4＞ -----------------------------------------------------------------

  it("ACE Overflow ＜-4＞ hands 4 memory to the opponent when it leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-064", as: "justi", under: [{ card: "BT11-073", as: "accel" }] }],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "wall", dp: 20_000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const justiTopId = s.perm("justi").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("justi").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === justiTopId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [justiTopId, s.inst("accel").instanceId].sort(),
    );
    // Overflow ＜-4＞: the catalog's `overflowMemory: 4` moves 4 memory to the opponent.
    expect(s.state.memory).toBe(-1);
    assertNoLoudGap(s);
  });

  it("cannot pay the cost when the only battle-area permanents are Digimon, and still attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-073", as: "base" },
            { card: "BT1-013", as: "digimonPeer" },
          ],
          hand: [{ card: "BT19-064", as: "justi" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-064");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 1);

    // No Option anywhere: the cost cannot be paid, so the attacker stays suspended and no
    // Digimon permanent was trashed in its place.
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});

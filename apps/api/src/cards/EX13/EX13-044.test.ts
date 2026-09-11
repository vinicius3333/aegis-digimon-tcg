import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-044.js";
// The whole registry, so the public fixtures (the evolution sources, the Assembly materials) carry
// their own implementations; EX13-044 itself is registered by the import above.
import "../index.js";

const cardId = "EX13-044";

// Fixtures, and why each one is here:
//   ST8-03   Dracomon     Blue Lv.3 2000 DP — [Dracomon] by NAME, and the Assembly Lv.3 material.
//                         Only ever seeded, never played, so its [On Play] reveal adds no noise.
//   BT20-023 Coredramon   Blue/Red Lv.4 5000 DP — [Dracomon]/[Examon] only in its EFFECT text, so
//                         it proves `match: "text"` reaches past the name. Assembly Lv.4 material.
//   BT20-025 Wingdramon   Blue/Red Lv.5 7000 DP — the [Wingdramon] alternate route, the printed
//                         Red Lv.5 EvoCost, and the Assembly Lv.5 material. Its inherited text is
//                         only ＜Security A. +1＞, so it is the quiet digivolve base.
//   EX3-020  Wingdramon   mono-BLUE Lv.5 — the alternate route on a color with NO printed EvoCost,
//                         proving the header is wider than the catalog EvoCosts.
//   EX3-041  Groundramon  mono-GREEN Lv.5 — the [Groundramon] half of the same header.
//   BT3-053  JewelBeemon  mono-Green Lv.5, no text — satisfies the printed GREEN Lv.5 EvoCost but
//                         NOT the named route: the `useAlternateCost` fallback negative.
//   BT1-038  Monzaemon    mono-BLUE Lv.5, no text — neither route: the illegal-source negative.
//   BT1-009  Monodramon   Red Lv.3 3000 DP, no text — the NEAR MISS: its name contains "dramon"
//                         but not "Dracomon", so every text filter must refuse it.
//   BT1-013  Muchomon     Red Lv.3 5000 DP, no text — the plain non-matching control.
//   BT1-010..BT1-014      inert red main-deck Digimon — digivolution-card, deck and board filler.
//   BT2-084  an opponent Tamer whose own effect only fires on ITS controller's turn — the Tamer
//                         fixture for the "Digimon or Tamers" half of both halves of the clause.
const NAME_MATCH = "ST8-03";
const TEXT_MATCH = "BT20-023";
const NEAR_MISS = "BT1-009";
const NON_MATCH = "BT1-013";
const TEXT_FILTER = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
  printedTextOnly: true,
};

describe("EX13-044 Breakdramon", () => {
  it("matches the catalog and the committed IR clause for clause", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Breakdramon",
      colors: ["Green", "Red"],
      kinds: ["Digimon"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine Dragon"],
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
    });

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    });

    // [On Play] [When Digivolving]: the optional up-to-2 suspend across BOTH seats, then the
    // mandatory two-permanent unsuspend lock. No printed [Once Per Turn] on the line.
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger);
      expect(effect?.frequency).toBeUndefined();
      expect(effect?.sharedUseKey).toBeUndefined();
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            optional: true,
            target: {
              count: 2,
              upTo: true,
              filter: { controllerDefault: "any", kind: ["Digimon", "Tamer"] },
            },
          },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
            target: { count: 2, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
          },
        ],
      });
      // The whole-turn lock, not the narrower unsuspend-phase-only variant.
      expect(effect?.actions[1]).not.toMatchObject({ restriction: "unsuspendDuringOwnUnsuspendPhase" });
    }

    // The battle clause is printed twice — main text and inherited text — each with its own
    // [Once Per Turn] and no shared use key.
    const battleClauses = compiled.effects.filter((effect) =>
      effect.actions.some((action) => action.kind === "SubTrigger"),
    );
    expect(battleClauses).toHaveLength(2);
    expect(battleClauses.map(({ isInherited }) => isInherited ?? false)).toEqual([false, true]);
    for (const effect of battleClauses) {
      expect(effect).toMatchObject({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              {
                kind: "Battle",
                optional: true,
                attacker: { count: 1, filter: TEXT_FILTER },
                defender: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
              },
            ],
          },
        ],
      });
      expect(effect.sharedUseKey).toBeUndefined();
      // "any of your Digimon", not "this Digimon": the watcher must NOT be self-scoped, whose
      // dedicated payload gate would also drop the rest of the source filter.
      expect(effect.actions[0]).not.toMatchObject({ sourceFilter: { isSelfRef: true } });
    }

    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { namesExact: ["Groundramon", "Wingdramon"], cost: 3, isAlternate: true },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        reduceCost: 5,
        materials: [5, 4, 3].map((level) => ({
          count: 1,
          level,
          nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
        })),
      },
    ]);
  });

  // [Digivolve] [Groundramon]/[Wingdramon]: Cost 3
  it("takes both named alternate routes for 3, the printed EvoCost for 4, and rejects an illegal source", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      // Mono-BLUE Wingdramon: no printed EvoCost covers it, so only the named route reaches here.
      ["EX3-020", true, 3],
      // Mono-GREEN Groundramon: the other half of the header.
      ["EX3-041", true, 3],
      // The printed Red Lv.5 EvoCost on the same card that the alternate route would take for 3.
      ["BT20-025", false, 4],
    ] as const) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "breakdramon" }] },
          1: { battleArea: [{ card: NON_MATCH, as: "bystander" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = memory;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("breakdramon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);

      expect(s.state.memory).toBe(0);
      // Source-stack identity survives the transition: the Lv.5 is now the single stack card.
      expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([baseCardId]);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Piercing")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
      // [When Digivolving] fired: the lone opponent Digimon took the unsuspend lock.
      expect(observe(s.engine).isRestricted(s.perm("bystander"), "unsuspend")).toBe(true);
    }

    // `useAlternateCost` is a preference, not a gate: a mono-GREEN Lv.5 that is neither
    // [Groundramon] nor [Wingdramon] silently falls back to the printed Green Lv.5 EvoCost, so the
    // proof is the memory actually charged (4, not the alternate route's 3) — never `ok: false`.
    const fallback = setupEngine(
      { 0: { battleArea: [{ card: "BT3-053", as: "base" }], hand: [{ card: cardId, as: "breakdramon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    fallback.state.memory = 4;
    await fallback.ready();
    expect(
      fallback.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fallback.perm("base").permanentId,
        instanceId: fallback.inst("breakdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => fallback.perm("base").topCard.cardId === cardId);
    expect(fallback.state.memory).toBe(0);

    // A mono-BLUE Lv.5 with no matching name satisfies neither route at all.
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "base" }], hand: [{ card: cardId, as: "breakdramon" }] },
    });
    illegal.state.memory = 4;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("breakdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.state.memory).toBe(4);
  });

  // [On Play] You may suspend up to 2 Digimon or Tamers.
  it("suspends up to 2 permanents across BOTH seats, Tamers included", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "opponentDigimon" },
            { card: "BT2-084", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    // Bias the up-to-2 pick onto the opponent's Digimon AND Tamer; the controller's own Breakdramon
    // is in the same candidate pool (proved separately below), so without the bias the two picks
    // could straddle the seats.
    preferInstanceIds.push(s.perm("opponentDigimon").topCard.instanceId, s.perm("opponentTamer").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(() => s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended).length === 2);

    // "up to 2" with no controller word: both of the opponent's permanents were legal choices, and
    // a Tamer is as legal as a Digimon.
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
  });

  it("includes the controller's own permanents in the suspend pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // The only permanents on the board are this seat's own, which is a legal pool ONLY because the
    // printed sentence names no controller.

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended));

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(2);
  });

  // Then, 2 of your opponent's Digimon or Tamers can't unsuspend until their turn ends.
  it("locks exactly 2 opponent permanents, leaving a third free to unsuspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "first", suspended: true },
            { card: NEAR_MISS, as: "second", suspended: true },
            { card: "BT1-014", as: "third", suspended: true },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(
      () =>
        s.state.players[1]!.battleArea.filter((permanent) => observe(s.engine).isRestricted(permanent, "unsuspend"))
          .length === 2,
    );

    const locked = s.state.players[1]!.battleArea.filter((permanent) =>
      observe(s.engine).isRestricted(permanent, "unsuspend"),
    );
    expect(locked).toHaveLength(2);

    // The lock is whole-turn, so the opponent's own unsuspend phase cannot clear it; the unlocked
    // third permanent does unsuspend.
    const unlocked = s.state.players[1]!.battleArea.find(
      (permanent) => !observe(s.engine).isRestricted(permanent, "unsuspend"),
    )!;
    await advance(s.engine).verb.unsuspend(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId));
    await settle();

    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === unlocked.permanentId)!.isSuspended,
    ).toBe(false);
  });

  it("still applies the mandatory lock when the optional suspend is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: { battleArea: [{ card: NON_MATCH, as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("victim"), "unsuspend"));

    // Nothing suspended — the "You may" was declined — yet the "Then" clause still resolved.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(false);
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "unsuspend")).toBe(true);
  });

  // [All Turns] [Once Per Turn] When any of your Digimon suspend, 1 of your Digimon with
  // [Dracomon] or [Examon] in its text may battle 1 of your opponent's Digimon.
  it("battles with a [Dracomon]-text ally when any of the controller's Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "trigger" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "prey" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const preyId = s.perm("prey").permanentId;

    // A plain ally suspending is enough: the watcher is board-wide over "your Digimon".
    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === preyId));

    // 12000 DP against 5000 DP: a direct §14 comparison, so the loser is deleted with no attack
    // declaration, no security check and no suspension of the battler.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([NON_MATCH]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining([cardId, NON_MATCH]),
    );
    expect(s.perm("breakdramon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not fire when an OPPONENT's Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, dp: 5000, as: "prey" },
            { card: "BT1-014", as: "trigger" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle();

    // "any of YOUR Digimon" — the opponent's suspension is not this watcher's event.
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("refuses the near-miss and the plain non-matching Digimon as the battler", async () => {
    // The watcher rides an inheriting host with no matching printed text, so the ONLY candidate
    // battlers on the board are the near miss and the control — both of which the text filter
    // must refuse, leaving nothing to battle with.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [cardId] },
            { card: NEAR_MISS, as: "nearMiss" },
            { card: NON_MATCH, as: "nonMatch" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "prey" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("nonMatch").permanentId]);
    await settle();

    // `printedTextOnly` also bites here: the host CARRIES EX13-044 among its digivolution cards,
    // so without it the host itself would read as a "[Dracomon]/[Examon] text Digimon"
    // (comprehensive §4-23-2: a Digimon gains a digivolution card's effects, never its text).
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.perm("host").stack.map(({ cardId: id }) => id)).toEqual([cardId]);
  });

  it("installs the same clause from an inheriting host, battling with a matching ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [cardId] },
            { card: TEXT_MATCH, as: "battler" },
            { card: NEAR_MISS, as: "trigger" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 1000, as: "prey" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const preyId = s.perm("prey").permanentId;

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === preyId));

    // BT20-023 Coredramon carries the tokens only in its EFFECT text, which is exactly what
    // `match: "text"` reaches and `match: "name"` would not.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
  });

  it("is once per turn and resets on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "trigger" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", dp: 4000, as: "firstPrey" },
            { card: "BT1-012", dp: 2000, as: "secondPrey" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstPreyId = s.perm("firstPrey").permanentId;
    const secondPreyId = s.perm("secondPrey").permanentId;

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    // Re-open a legal event, then prove the same-turn second suspension is refused anyway.
    await advance(s.engine).verb.unsuspend([s.perm("trigger").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    // Run the real turn loop back round to this controller's own turn, then it is armed again.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect([firstPreyId, secondPreyId]).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("fires off a real attack declaration, whose own suspension is the event", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "prey" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // Declaring the attack suspends Breakdramon, which is "any of your Digimon suspend".
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The battle killed the only opponent Digimon, and the attack on the player still checked the
    // one security card.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("breakdramon").isSuspended).toBe(true);
  });

  // ＜Piercing＞: §16-5 — excess damage after deleting the defending Digimon checks security.
  it("pierces through to security after winning a Digimon battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, suspended: true, as: "defender" }], security: ["BT1-010"] },
      },
      // Decline the suspend-driven battle so the ATTACK itself is what deletes the defender.
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("breakdramon"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // Piercing carried the attack into security even though the declared target was a Digimon.
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  // ＜Blocker＞: §16-4.
  it("blocks an opponent's attack on the player and wins the battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }], security: ["BT1-010"] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "attacker" }] },
      },
      // Blocking suspends the blocker, which would otherwise open this card's own battle window.
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    const window = s.events.findLast(({ kind }) => kind === "blockWindowOpened");
    if (window?.kind !== "blockWindowOpened") throw new Error("block window did not open");
    expect(window.eligibleBlockerIds).toContain(s.perm("breakdramon").permanentId);

    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("breakdramon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  // [Assembly -5] Lv.5 × Lv.4 × Lv.3, all w/[Dracomon]/[Examon] in text
  it("assembles for 7 from one trash material per printed level and enforces each slot", async () => {
    const valid = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "breakdramon" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [
            { card: "BT20-025", as: "m0" },
            { card: TEXT_MATCH, as: "m1" },
            { card: NAME_MATCH, as: "m2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 7;
    await valid.ready();

    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("breakdramon").instanceId,
        assembly: {
          materialInstanceIds: [valid.inst("m0").instanceId, valid.inst("m1").instanceId, valid.inst("m2").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));

    // Play cost 12 reduced by the printed 5.
    expect(valid.state.memory).toBe(0);
    // §7-3-2-6: the header's left-to-right reading fixes the stack, left-most on top.
    const assembled = valid.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    expect(assembled.stack.map(({ cardId: id }) => id)).toEqual([NAME_MATCH, TEXT_MATCH, "BT20-025"]);

    for (const materials of [
      // Slot 0 needs Lv.5: a second Lv.4 text card does not satisfy it.
      [TEXT_MATCH, TEXT_MATCH, NAME_MATCH],
      // Lv.5 without [Dracomon]/[Examon] anywhere in its text.
      ["BT1-038", TEXT_MATCH, NAME_MATCH],
      // The near miss in the Lv.3 slot: "Monodramon" is not "Dracomon".
      ["BT20-025", TEXT_MATCH, NEAR_MISS],
    ]) {
      const s = setupEngine({
        0: {
          hand: [{ card: cardId, as: "breakdramon" }],
          trash: materials.map((card, index) => ({ card, as: `m${index}` })),
        },
      });
      s.state.memory = 7;
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("breakdramon").instanceId,
          assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`m${index}`).instanceId) },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
      expect(s.state.memory).toBe(7);
    }
  });
});

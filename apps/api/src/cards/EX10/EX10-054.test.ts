import { EffectTiming, getCardDefinition, type DecisionRequest, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-054.js";
import "../index.js";

const CARD_ID = "EX10-054";

// Level 5 cost candidates for "[Myotismon] in its text" (KB Q5137: name ∪ traits ∪ every
// printed text, not just the name).
const MYOTISMON_BY_NAME = "BT2-075"; // Myotismon, Lv.5 Purple, no printed text at all.
const MYOTISMON_BY_EFFECT_TEXT = "EX10-047"; // Arukenimon, Lv.5 — [Myotismon] only in its effect text.
const GREEN_LV5 = "BT11-053"; // Digitamamon, Lv.5 Green 10000, inert — the second printed evo route.
const NO_MYOTISMON_LV5 = "BT10-079"; // Sandiramon, Lv.5 Purple, inert: never a legal cost.

// Inert fixtures. No printed or inherited text, so nothing they do can open a decision.
const INERT_LV3 = "BT1-013"; // Muchomon, Red 5000.
const INERT_LV4 = "BT1-014"; // Kokatorimon, Red 4000.
const SPARE_HAND_CARD = "ST1-02"; // Biyomon — keeps Main from auto-passing.

// Opposing Tamers. No inert Tamer exists in the catalog; these two carry only static DP
// clauses that cannot fire in these fixtures (seat 1 never attacks security here, and
// "[Your Turn]" is inactive while seat 0 holds the turn).
const TAMER_A = "ST1-12"; // Tai Kamiya — "[Your Turn] All of your Digimon get +1000 DP".
const TAMER_B = "ST3-12"; // T.K. Takaishi — "[Opponent's Turn] ... Security Digimon get +2000 DP".

const neutralSeat = () => ({
  hand: [SPARE_HAND_CARD],
  security: [INERT_LV3, INERT_LV4, INERT_LV3],
  deck: [INERT_LV3, INERT_LV4, INERT_LV3],
});

type Selection = DecisionRequest & { options?: { candidateInstanceIds?: string[] } };

/**
 * Answer the next N card/target selections by hand.
 *
 * `autoSelectCards` sorts every selection with the SAME preference list, so it cannot
 * express "suspend these two, restrict those two" — exactly the independence KB Q5138
 * asks about. This driver answers each selection from its own picker instead, and asserts
 * the candidate set it was offered, so a wrong filter fails loudly rather than silently
 * landing on another candidate.
 */
function answerSelections(s: EngineSetup, pickers: ((candidates: string[]) => string[])[]): Promise<void> {
  let cursor = 0;
  const isSelection = (req: DecisionRequest): boolean => req.kind === "selectCards" || req.kind === "chooseTargets";
  const run = async (): Promise<void> => {
    for (const pick of pickers) {
      await settle(() => s.decisions.some(({ req }, index) => index >= cursor && isSelection(req)));
      const index = s.decisions.findIndex(({ req }, at) => at >= cursor && isSelection(req));
      expect(index, "a selection decision was expected but never opened").toBeGreaterThanOrEqual(0);
      cursor = index + 1;
      const entry = s.decisions[index] as { seat: Seat; req: Selection };
      const candidates = entry.req.options?.candidateInstanceIds ?? [];
      const response =
        entry.req.kind === "selectCards"
          ? { kind: "selectCards" as const, instanceIds: pick(candidates) }
          : { kind: "chooseTargets" as const, instanceIds: pick(candidates) };
      s.engine.applyIntent(entry.seat, {
        type: "respondDecision",
        decisionId: entry.req.decisionId,
        response,
      });
    }
  };
  return run();
}

/** The decision ids a permanent can be offered under: its permanent id or its top card. */
function idsOf(s: EngineSetup, alias: string): string[] {
  const permanent = s.perm(alias);
  return [permanent.permanentId, permanent.topCard?.instanceId].filter((id): id is string => id !== undefined);
}

/** Pick exactly the named permanents out of a candidate list, asserting each was offered. */
function choose(s: EngineSetup, aliases: string[]): (candidates: string[]) => string[] {
  return (candidates) =>
    aliases.map((alias) => {
      const id = idsOf(s, alias).find((candidate) => candidates.includes(candidate));
      expect(id, `"${alias}" was not offered as a candidate (offered: ${candidates.join(", ")})`).toBeDefined();
      return id as string;
    });
}

// The interpreter's stable key for the card's single [Main] clause, asserted in the
// positive path below and reused by the negative so it drives the same effect.
// A [Main] clause is registered under the OnDeclaration window (see registration/module.ts).
const trashMainEffectKey = `${CARD_ID}/ir-${EffectTiming.OnDeclaration}-0`;

describe("EX10-054 VenomMyotismon", () => {
  it("matches the catalog and carries every printed clause as IR", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "VenomMyotismon",
      colors: ["Purple", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Animal"],
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
    // CATALOG DEFECT (reported, not edited): the stored text holds a NON-BREAKING SPACE
    // (U+00A0) between "[Myotismon]" and "in its text". Harmless for matching — the compiled
    // token is "Myotismon" — but it makes an exact-text comparison fail confusingly.
    expect(definition.effectText).toContain("[Myotismon]\u00a0in its text");
    expect(definition.effectText!.replace(/\u00a0/g, " ")).toBe(
      "[Trash] [Main] By deleting 1 of your level 5 Digimon with [Myotismon] in its text, " +
        "play this card with the play cost reduced by 7.\n" +
        "[On Play] [When Digivolving] You may suspend 2 of your opponent's Digimon or Tamers. " +
        "Then, 2 of their Digimon or Tamers can't unsuspend until their turn ends.\n" +
        "[On Deletion] Delete 1 of your opponent's suspended Digimon.",
    );

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    // "[Myotismon] in its text" is the full-text union, so match must be "text", not "name".
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { isSelf: true },
          from: ["trash"],
          payCost: true,
          reduceCostBy: 7,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levels: [5],
                nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }],
              },
              count: 1,
            },
          },
        },
      ],
    });
    // Q5138: the restriction carries its OWN target, not a `sameTarget` continuation of the
    // suspend, which is what lets the two halves land on different cards.
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
            optional: true,
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
            restriction: "unsuspend",
            // "until their turn ends" from the controller's seat = the opponent's turn end.
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("Q5137 pays with a level 5 Digimon whose only [Myotismon] is in its effect text", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [
            { card: MYOTISMON_BY_EFFECT_TEXT, as: "byText" },
            { card: NO_MYOTISMON_LV5, as: "noMyotismon" },
          ],
          trash: [{ card: CARD_ID, as: "venom" }],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // Steer the cost onto the text-only match; Sandiramon must never be offered at all.
    preferred.push(s.perm("byText").topCard!.instanceId, s.perm("byText").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    const [entry] = JSON.parse(s.inst("venom").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(entry, "the [Trash] [Main] effect is not offered on the trashed card").toBeDefined();
    expect(entry!.effectKey).toBe(trashMainEffectKey);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("venom").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("venom").instanceId),
    );

    // Play cost 12 - 7 = 5, paid in full out of memory.
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 0, reason: "playCard" });
    // The cost deleted Arukenimon (text match) and left Sandiramon (no match) alone.
    const board = s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId);
    expect(board).toContain(NO_MYOTISMON_LV5);
    expect(board).not.toContain(MYOTISMON_BY_EFFECT_TEXT);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(MYOTISMON_BY_EFFECT_TEXT);
    // VenomMyotismon arrived as a fresh permanent with no digivolution cards.
    const venom = s.perm("venom");
    expect(venom.stack).toHaveLength(0);
    expect(venom.currentDP).toBe(12000);

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5137 refuses the trash route when the only level 5 Digimon has no [Myotismon] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: NO_MYOTISMON_LV5, as: "noMyotismon" }],
          trash: [{ card: CARD_ID, as: "venom" }],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    // The cost has no legal candidate, so the effect is never offered on the trashed card.
    const offered = JSON.parse(s.inst("venom").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(offered).toEqual([]);
    // Activating it anyway, with the key the positive path used, is refused outright.
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("venom").instanceId,
        effectKey: trashMainEffectKey,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(5);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("venom").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([NO_MYOTISMON_LV5]);

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5138 suspends 2 and restricts 2 DIFFERENT cards, and the restriction survives the opponent's unsuspend phase", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          hand: [{ card: CARD_ID, as: "venom" }, SPARE_HAND_CARD],
        },
        1: {
          ...neutralSeat(),
          battleArea: [
            { card: INERT_LV3, as: "standingA" },
            { card: INERT_LV4, as: "standingB" },
            // Already suspended, so a restriction on them is observable at the next
            // unsuspend phase without this effect having to suspend them itself.
            { card: TAMER_A, as: "tamerA", suspended: true },
            { card: TAMER_B, as: "tamerB", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 12;

    // Suspend the two STANDING Digimon; restrict the two ALREADY-SUSPENDED Tamers.
    const answered = answerSelections(s, [choose(s, ["standingA", "standingB"]), choose(s, ["tamerA", "tamerB"])]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("venom").instanceId })).toEqual({ ok: true });
    await answered;
    await settle(() => s.perm("standingA").isSuspended && s.perm("standingB").isSuspended);

    // The two halves landed on different cards (Q5138).
    expect(s.perm("standingA").isSuspended).toBe(true);
    expect(s.perm("standingB").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("standingA"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("standingB"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tamerA"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamerB"), "unsuspend")).toBe(true);

    // Seat 1's unsuspend phase: the unrestricted pair wakes up, the restricted pair does not.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("standingA").isSuspended).toBe(false);
    expect(s.perm("standingB").isSuspended).toBe(false);
    expect(s.perm("tamerA").isSuspended).toBe(true);
    expect(s.perm("tamerB").isSuspended).toBe(true);

    // "until their turn ends": the restriction is gone by seat 1's NEXT unsuspend phase.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("tamerA"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tamerB"), "unsuspend")).toBe(false);
    expect(s.perm("tamerA").isSuspended).toBe(false);
    expect(s.perm("tamerB").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Digivolving] refuses a Lv.4 source and fires on the public Lv.5 Green evolution route", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          hand: [{ card: CARD_ID, as: "venom" }, SPARE_HAND_CARD],
          battleArea: [
            { card: GREEN_LV5, as: "source" },
            { card: INERT_LV4, as: "illegalSource" },
          ],
        },
        1: {
          ...neutralSeat(),
          battleArea: [
            { card: INERT_LV3, as: "theirA" },
            { card: INERT_LV4, as: "theirB" },
            { card: TAMER_A, as: "theirTamer", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    const sourceInstanceId = s.perm("source").topCard!.instanceId;

    // Illegal source: a Lv.4 satisfies neither printed requirement (Purple Lv.5 / Green Lv.5).
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("illegalSource").permanentId,
        instanceId: s.inst("venom").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(4);
    expect(s.perm("illegalSource").topCard?.cardId).toBe(INERT_LV4);

    const answered = answerSelections(s, [choose(s, ["theirA", "theirB"]), choose(s, ["theirTamer", "theirA"])]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("venom").instanceId,
      }),
    ).toEqual({ ok: true });
    await answered;
    await settle(() => s.perm("venom").topCard?.cardId === CARD_ID && s.perm("theirB").isSuspended);

    // Evolution paid 4 memory (12 -> ... -> 4 - 4 = 0) and stacked the Lv.5 source underneath.
    const venom = s.perm("venom");
    expect(venom.topCard?.cardId).toBe(CARD_ID);
    expect(venom.stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(venom.currentDP).toBe(12000);
    expect(s.state.memory).toBe(0);

    expect(s.perm("theirA").isSuspended).toBe(true);
    expect(s.perm("theirB").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("theirTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("theirA"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("theirB"), "unsuspend")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the optional suspend leaves every opposing card standing", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          hand: [{ card: CARD_ID, as: "venom" }, SPARE_HAND_CARD],
        },
        1: {
          ...neutralSeat(),
          battleArea: [
            { card: INERT_LV3, as: "theirA" },
            { card: INERT_LV4, as: "theirB" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("venom").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("venom").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("theirA").isSuspended).toBe(false);
    expect(s.perm("theirB").isSuspended).toBe(false);
    // The restriction clause after "Then," is a separate process, not an optional processing
    // condition, so declining the "may" does not suppress it (CR 15-6-2 / 15-7-1 boundary).
    expect(observe(s.engine).isRestricted(s.perm("theirA"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("theirB"), "unsuspend")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves on the Lv.5 Purple route for 4 memory and stacks the source underneath", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          hand: [{ card: CARD_ID, as: "venom" }, SPARE_HAND_CARD],
          battleArea: [{ card: MYOTISMON_BY_NAME, as: "source" }],
        },
        // No opposing permanent at all: both halves of the [When Digivolving] clause have
        // nothing to resolve against, so this route needs no decision to reach its endpoints.
        1: neutralSeat(),
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    const sourceInstanceId = s.perm("source").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("venom").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    const venom = s.perm("source");
    expect(venom.stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(venom.currentDP).toBe(12000);
    expect(s.state.memory).toBe(0);
    // The hand card left for the evolution and the digivolution bonus draw replaced it.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([SPARE_HAND_CARD, INERT_LV3]);

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[On Deletion] deletes the attacker that suspended itself, and nothing standing", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: CARD_ID, as: "venom", dp: 1000, suspended: true }],
        },
        1: {
          ...neutralSeat(),
          battleArea: [
            { card: INERT_LV3, as: "attacker" },
            { card: INERT_LV4, as: "standing" },
            { card: TAMER_A, as: "suspendedTamer", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Seat 1 attacks directly: no turn loop, so the seeded suspended Tamer is never woken by
    // an unsuspend phase and stays on the board as the "Digimon only" negative control.
    s.state.turnSeat = 1;
    await s.ready();
    const venomPermanentId = s.perm("venom").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: venomPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === venomPermanentId));
    await settle(() => s.state.pendingDecision === undefined);

    // The 5000 DP attacker beat the 1000 DP VenomMyotismon, suspended itself to attack, and
    // was then the only legal target of "1 of your opponent's suspended Digimon".
    const theirBoard = s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId);
    expect(theirBoard).not.toContain(INERT_LV3);
    expect(theirBoard).toContain(INERT_LV4); // standing Digimon: not a legal target
    expect(theirBoard).toContain(TAMER_A); // suspended TAMER: not a Digimon, not a legal target
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain(INERT_LV3);
  });
});

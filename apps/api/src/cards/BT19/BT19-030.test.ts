import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-030.js";

/**
 * BT19-030 Renamon (Yellow, Lv.3, Data, Beastkin, 1000 DP, play cost 3).
 *
 * Main:      [Start of Your Main Phase] If you have [Rika Nonaka]/[Calumon], gain 1 memory.
 * Inherited: [Your Turn] [Once Per Turn] When you use an Option card with a cost of 2 or more,
 *            1 of your opponent's Digimon gets -2000 DP for the turn.
 *
 * Every clause below is proved through public intents or the real turn loop. The inherited clause
 * is proved under a real Renamon evolution stack (Renamon -> Kyubimon -> Taomon -> Sakuyamon),
 * never with an injected `fireSubTrigger`.
 */

type Setup = ReturnType<typeof setupEngine>;

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];
const FILLER_DECK = ["BT1-012", "BT1-012", "BT1-012", "BT1-012"];

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

describe("BT19-030 Renamon", () => {
  it("matches the printed catalog text and compiles both printed clauses", () => {
    expect(getCardDefinition("BT19-030")).toMatchObject({
      cardId: "BT19-030",
      nameEn: "Renamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      attributes: ["Data"],
      types: ["Beastkin"],
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      effectText: "[Start of Your Main Phase] If you have [Rika Nonaka]/[Calumon], gain 1 memory.",
    });
    expect(getCardDefinition("BT19-030")!.inheritedEffectText!.replace(/ /g, " ")).toBe(
      "[Your Turn] [Once Per Turn]When you use an Option card with a cost of 2 or more, 1 of your " +
        "opponent's Digimon gets -2000 DP for the turn.",
    );
    // No printed [Digivolve] route: the printed evolution cost is the only legal source.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            // Bracketed [Rika Nonaka]/[Calumon] is an EXACT name gate, not the substring gate.
            filter: { nameOrTrait: [{ tokens: ["Rika Nonaka", "Calumon"], match: "nameExact" }] },
          },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [
            {
              kind: "ModifyDP",
              amount: -2000,
              duration: "forTheTurn",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["BT19-083", "the yellow Tamer [Rika Nonaka]"],
    ["BT19-077", "the white Digimon [Calumon]"],
  ])("gains 1 memory inside the open Main phase when you have %s (%s)", async (supportCard) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-030", as: "rena" },
          { card: supportCard, as: "support" },
        ],
        hand: [{ card: "BT1-012", as: "spare" }],
        security: INERT_SECURITY,
        deck: FILLER_DECK,
      },
      1: { security: INERT_SECURITY, deck: FILLER_DECK },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    // Read memory while Main is genuinely open; a post-runTurn read sees the pass value.
    const memoryInMain = s.state.memory;
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    // The harness board opens the first turn on 0 memory, so the clause is the whole gain.
    expect(memoryInMain).toBe(1);
    assertNoLoudGap(s);
  });

  it("gains nothing for near-miss peers whose names are not [Rika Nonaka] or [Calumon]", async () => {
    // ST22-02 is a Renamon (the same character line, wrong name); BT1-014 is an unrelated peer.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-030", as: "rena" },
          { card: "ST22-02", as: "renamonPeer" },
          { card: "BT1-014", as: "unrelatedPeer" },
        ],
        hand: [{ card: "BT1-012", as: "spare" }],
        security: INERT_SECURITY,
        deck: FILLER_DECK,
      },
      1: { security: INERT_SECURITY, deck: FILLER_DECK },
    });
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    const memoryInMain = s.state.memory;
    closeMain(s, 0);
    await stopLoop(s, loop, 0);

    expect(memoryInMain).toBe(0);
  });

  it("gains nothing during the opponent's Main phase", async () => {
    // Comparative: the same board with and without [Rika Nonaka]. The clause changes seat 0's
    // own Main phase and must leave the opponent's Main phase identical.
    const build = (withRika: boolean): Setup =>
      setupEngine({
        0: {
          battleArea: withRika
            ? [
                { card: "BT19-030", as: "rena" },
                { card: "BT19-083", as: "rika" },
              ]
            : [{ card: "BT19-030", as: "rena" }],
          hand: [{ card: "BT1-012", as: "spare" }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
        1: {
          hand: [{ card: "BT1-012", as: "opponentSpare" }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      });

    const readMemories = async (s: Setup): Promise<{ own: number; opponent: number }> => {
      await s.ready();
      const loop = s.engine.startTurnLoop();
      await openMain(s, 0);
      const own = s.state.memory;
      closeMain(s, 0);
      await openMain(s, 1);
      const opponent = s.state.memory;
      closeMain(s, 1);
      await stopLoop(s, loop, 1);
      return { own, opponent };
    };

    const withRika = await readMemories(build(true));
    const withoutRika = await readMemories(build(false));

    expect(withRika.own).toBe(withoutRika.own + 1);
    expect(withRika.opponent).toBe(withoutRika.opponent);
  });

  it("publicly digivolves from a yellow Lv.2 source for the printed cost of 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "ST22-01", as: "viximon" },
        hand: [{ card: "BT19-030", as: "rena" }],
        security: INERT_SECURITY,
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
      },
      1: { security: INERT_SECURITY, deck: FILLER_DECK },
    });
    s.state.memory = 0;
    await s.ready();
    const viximonId = s.inst("viximon").instanceId;
    const renaId = s.inst("rena").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: renaId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === renaId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([viximonId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("refuses an illegal off-colour Lv.2 source and an illegal same-level source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        battleArea: [{ card: "BT19-030", as: "sameLevel" }],
        hand: [{ card: "BT19-030", as: "rena" }],
        security: INERT_SECURITY,
        deck: FILLER_DECK,
      },
      1: { security: INERT_SECURITY, deck: FILLER_DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const renaId = s.inst("rena").instanceId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("redEgg").permanentId, instanceId: renaId }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("sameLevel").permanentId, instanceId: renaId }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([renaId]);
    expect(s.state.memory).toBe(5);
  });

  it("reduces exactly 1 opponent Digimon by 2000 when a cost-2 Option is really used (Q5459)", async () => {
    // Real Renamon line: BT19-030 sits in ST22-03 Kyubimon's digivolution cards.
    let setup: Setup | undefined;
    let optionAlreadyTrashedWhenReduced: boolean | undefined;
    /** The first instant the reduction is visible: was the used Option already in the trash? */
    const sampleReduction = (): boolean => {
      if (setup === undefined) return false;
      const reduced = setup.state.players[1]!.battleArea.some((permanent) => permanent.currentDP === 18_000);
      if (reduced && optionAlreadyTrashedWhenReduced === undefined) {
        optionAlreadyTrashedWhenReduced = setup.state.players[0]!.trash.some((card) => card.cardId === "BT1-102");
      }
      return reduced;
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: [{ card: "BT19-030", as: "rena" }] }],
          hand: [
            { card: "BT1-102", as: "option" },
            { card: "BT1-012", as: "spare" },
          ],
          security: INERT_SECURITY,
          deck: [{ card: "BT1-012", as: "drawn" }, "BT1-012", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "targetOne", dp: 20_000 },
            { card: "BT9-035", as: "targetTwo", dp: 20_000 },
          ],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true },
    );
    setup = s;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(sampleReduction);

    // Exactly one opponent Digimon lost 2000 DP; the other and my own host are untouched.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.currentDP).sort()).toEqual([18_000, 20_000]);
    expect(s.perm("host").currentDP).toBe(6000);
    // Q5459: the reaction activates only after the used Option's [Main] effect has resolved
    // and the card has completed its routing to the trash.
    expect(optionAlreadyTrashedWhenReduced).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("does not trigger for an Option whose use cost is 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: [{ card: "BT19-030", as: "rena" }] }],
          hand: [
            { card: "ST3-13", as: "cheapOption" },
            { card: "BT1-012", as: "spare" },
          ],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "target", dp: 20_000 }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheapOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST3-13"));

    expect(s.perm("target").currentDP).toBe(20_000);
    expect(s.state.memory).toBe(4);
  });

  it("applies once per turn and re-arms on your next turn", async () => {
    // BT4-104 Blinding Ray is a cost-0 Option: it funds the turn without ever clearing the
    // "2 or more" gate, so the once-per-turn window is spent only by the BT1-102 plays.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-03", as: "host", under: [{ card: "BT19-030", as: "rena" }] },
            { card: "BT19-083", as: "rika" },
          ],
          hand: [
            { card: "BT4-104", as: "fundOne" },
            { card: "BT4-104", as: "fundTwo" },
            { card: "BT4-104", as: "fundThree" },
            { card: "BT1-102", as: "optionOne" },
            { card: "BT1-102", as: "optionTwo" },
            { card: "BT1-102", as: "optionThree" },
            { card: "BT1-012", as: "spare" },
          ],
          security: ["BT1-009", "BT1-011", "BT1-012", "BT1-009", "BT1-011", "BT1-012"],
          deck: Array.from({ length: 20 }, () => "BT1-012"),
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "target", dp: 20_000 }],
          hand: [{ card: "BT1-012", as: "opponentSpare" }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    const play = async (alias: string, until: () => boolean): Promise<void> => {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(until);
      await settle(() => s.state.pendingDecision === undefined);
    };

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    const fundCount = (n: number) => () => s.state.players[0]!.trash.filter((c) => c.cardId === "BT4-104").length === n;
    const optionCount = (n: number) => () =>
      s.state.players[0]!.trash.filter((c) => c.cardId === "BT1-102").length === n;

    await play("fundOne", fundCount(1));
    await play("fundTwo", fundCount(2));
    await play("optionOne", () => s.perm("target").currentDP === 18_000);
    // Intermediate state: the first cost-2 Option spent the once-per-turn window.
    expect(s.perm("target").currentDP).toBe(18_000);
    expect(s.state.players[0]!.trash.filter((c) => c.cardId === "BT1-102")).toHaveLength(1);

    await play("optionTwo", optionCount(2));
    expect(s.state.turnSeat).toBe(0);
    // Still exactly one application: a second cost-2 Option in the same turn does nothing.
    expect(s.perm("target").currentDP).toBe(18_000);
    closeMain(s, 0);

    // The opponent's whole turn passes: "for the turn" expires and the window re-arms.
    await openMain(s, 1);
    closeMain(s, 1);
    await openMain(s, 0);
    expect(s.perm("target").currentDP).toBe(20_000);

    await play("fundThree", fundCount(3));
    await play("optionThree", () => s.perm("target").currentDP === 18_000);
    expect(s.perm("target").currentDP).toBe(18_000);
    expect(s.state.turnSeat).toBe(0);
    closeMain(s, 0);
    await stopLoop(s, loop, 0);
  });

  it("does not trigger when the opponent uses a cost-2 Option on their own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST22-03", as: "host", under: [{ card: "BT19-030", as: "rena" }] }],
          hand: [{ card: "BT1-012", as: "spare" }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "yellowSource", dp: 20_000 }],
          hand: [
            { card: "BT1-102", as: "opponentOption" },
            { card: "BT1-012", as: "opponentSpare" },
          ],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);
    closeMain(s, 0);
    await openMain(s, 1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-102"));
    closeMain(s, 1);
    await stopLoop(s, loop, 1);

    // [Your Turn]: an Option the OPPONENT uses never arms this clause.
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("yellowSource").currentDP).toBe(20_000);
  });

  it.each([
    [5, 20_000, "the use cost itself drops to 1, so it does not trigger (Q5461)"],
    [4, 18_000, "the use cost stays at 2, so it triggers"],
  ])(
    "reads BT8-097's in-hand use-cost reduction with %i opponent Digimon: %s",
    async (opponentCount, expectedLowestDP) => {
      // BT8-097 Crimson Blaze reduces its OWN use cost in hand by 1 per opponent Digimon —
      // exactly the family Q5461 names. Every opponent Digimon sits at 20000 DP so the
      // card's own "delete all with 6000 DP or less" clause deletes nothing.
      const opponents = Array.from({ length: opponentCount }, (_, index) => ({
        card: index === 0 ? "BT1-014" : "BT9-035",
        as: `opponent${index}`,
        dp: 20_000,
      }));
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST22-03", as: "host", under: [{ card: "BT19-030", as: "rena" }] },
              { card: "BT1-014", as: "redSource", dp: 20_000 },
            ],
            hand: [
              { card: "BT8-097", as: "crimson" },
              { card: "BT1-012", as: "spare" },
            ],
            security: INERT_SECURITY,
            deck: FILLER_DECK,
          },
          1: { battleArea: opponents, security: INERT_SECURITY, deck: FILLER_DECK },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimson").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097"));

      const dps = s.state.players[1]!.battleArea.map((permanent) => permanent.currentDP).sort((a, b) => a - b);
      expect(dps[0]).toBe(expectedLowestDP);
      expect(s.state.players[1]!.battleArea).toHaveLength(opponentCount);
      // The paid memory confirms which use cost the engine actually applied.
      expect(s.state.memory).toBe(8 - (6 - opponentCount));
    },
  );

  it("does not trigger when an Option's effect activates through ＜Delay＞ rather than being used (Q5460)", async () => {
    // BT10-100 Impulse Memory Boost! is a cost-3 yellow Option already resting in the battle
    // area; activating its ＜Delay＞ clause is not "using an Option card".
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST22-03", as: "host", under: [{ card: "BT19-030", as: "rena" }] },
            { card: "BT10-100", as: "delayed" },
          ],
          hand: [{ card: "BT1-012", as: "spare" }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "target", dp: 20_000 }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.perm("delayed").placedByEffect = true;
    s.state.turnCount += 1;
    s.state.memory = 5;
    await s.ready();

    const activatable = observe(s.engine).activatableEffects(s.perm("delayed"));
    expect(activatable.length).toBeGreaterThan(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("delayed").topCard!.instanceId,
        effectKey: activatable[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-100"));

    expect(s.perm("target").currentDP).toBe(20_000);
  });

  it("triggers when an effect uses a cost-6 Option without paying for it (Q5462/Q5463)", async () => {
    // A realistic Renamon stack: Renamon -> Kyubimon -> Taomon, digivolving into ST22-05
    // Sakuyamon whose [When Digivolving] USES ST22-10 Amethyst Mandala (use cost 6) from hand
    // without paying the cost. Renamon's inherited clause answers from inside the stack.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST22-04",
              as: "taomon",
              under: [
                { card: "BT19-030", as: "rena" },
                { card: "ST22-03", as: "kyubimon" },
              ],
            },
          ],
          hand: [
            { card: "ST22-05", as: "sakuyamon" },
            { card: "ST22-10", as: "mandala" },
            { card: "BT1-012", as: "spare" },
          ],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "target", dp: 20_000 }],
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    const renaId = s.inst("rena").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("taomon").permanentId,
        instanceId: s.inst("sakuyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 18_000);

    // The Option was used for free (its printed use cost of 6 still clears the "2 or more"
    // gate) and the reduction came from Renamon deep inside the real evolution stack.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("mandala").instanceId)).toBe(false);
    expect(s.perm("taomon").topCard?.cardId).toBe("ST22-05");
    expect(s.perm("taomon").stack.map((card) => card.instanceId)).toContain(renaId);
    expect(s.perm("target").currentDP).toBe(18_000);
  });
});

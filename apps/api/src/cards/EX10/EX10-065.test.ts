import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  setupEngine,
  settle,
  type BoardSpec,
  type EngineSetup,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-065.js";
import "../index.js";

// EX10-065 Yukio Oikawa (Tamer, Purple, cost 4)
//   [Start of Your Turn] If you have 2 or less memory, set it to 3.
//   [All Turns] When any of your Digimon with [Myotismon] in their names are played, by
//     deleting this Tamer, 1 of those Digimon gains <Rush> for the turn. Then, gain 1 memory.
//   [Security] Play this card without paying the cost.

const CARD_ID = "EX10-065";
/** Inert Lv.5 Purple "Myotismon" — no main, inherited or security text at all. */
const MYOTISMON = "BT2-075";
/** "VenomMyotismon" — the name-substring boundary; its own text is inert on your own turn. */
const VENOM = "BT2-079";
const NEUTRAL_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];
const NEUTRAL_DECK = ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"];

function turnBoard(seat0: BoardSpec[0], seat1?: BoardSpec[1]): BoardSpec {
  return {
    0: { deck: [...NEUTRAL_DECK], security: [...NEUTRAL_SECURITY], ...seat0 },
    1: {
      deck: [...NEUTRAL_DECK],
      security: [...NEUTRAL_SECURITY],
      hand: [{ card: "BT1-009", as: "opponentSpare" }],
      ...seat1,
    },
  };
}

/** Start the real turn loop on seat 0 and stop inside its open Main phase. */
async function runSeat0Turn(board: BoardSpec, opts: SetupEngineOptions, memory?: number) {
  const s = setupEngine(board, opts);
  if (memory !== undefined) s.state.memory = memory;
  const loop = s.engine.startTurnLoop();
  for (let i = 0; i < 500 && s.state.phase !== Phase.Main; i += 1) {
    if (s.state.phase === Phase.Breeding && s.state.turnSeat === 0) {
      s.engine.applyIntent(0, { type: "endPhase" });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

/** Close the turn loop from whichever phase the test stopped in. */
async function finish(s: EngineSetup, loop: Promise<unknown>) {
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX10-065 Yukio Oikawa", () => {
  it("matches every catalog field and the complete compiled contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Yukio Oikawa",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["-"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition(CARD_ID)!.inheritedEffectText ?? "").toBe("");
    // The catalog stores a NON-BREAKING SPACE (U+00A0) after "[Myotismon]" in this card's
    // second clause; the text is compared with whitespace normalized so the assertion is
    // about the printed wording, not about that catalog artefact. Reported, not edited.
    expect(getCardDefinition(CARD_ID)!.effectText!.replace(/\s/g, " ")).toBe(
      "[Start of Your Turn] If you have 2 or less memory, set it to 3. " +
        "[All Turns] When any of your Digimon with [Myotismon] in their names are played, by deleting this Tamer, 1 of those Digimon gains ＜Rush＞ for the turn. Then, gain 1 memory.",
    );

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find(({ trigger }) => trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            // "in their names" is a substring test, so `match: "name"` (not `nameExact`).
            nameOrTrait: [{ tokens: ["Myotismon"], match: "name" }],
          },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Rush" },
              target: { sourceRef: "triggerSubject", count: 1 },
              duration: "forTheTurn",
              optional: true,
              abortOnDecline: true,
              cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, isSelf: true } },
            },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    });
    expect(compiled.effects?.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true }, isSelf: true } }],
    });
  });

  it("[Start of Your Turn] sets memory to 3 from 2 through the real turn loop", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: CARD_ID, as: "oikawa" }],
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoAcceptOptional: true },
      2,
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    await finish(s, loop);
  });

  it("[Start of Your Turn] leaves memory above the gate untouched", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: CARD_ID, as: "oikawa" }],
        hand: [{ card: "BT1-009", as: "spare" }],
      }),
      { autoAcceptOptional: true },
      4,
    );

    expect(s.state.memory).toBe(4);
    await finish(s, loop);
  });

  it("deletes itself to give the played Myotismon <Rush> and then gains 1 memory", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard(
        {
          battleArea: [{ card: CARD_ID, as: "oikawa" }],
          hand: [
            { card: MYOTISMON, as: "myotismon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        {
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          battleArea: [{ card: "BT1-013", as: "victim" }],
        },
      ),
      { autoAcceptOptional: true, autoSelectCards: true },
      10,
    );
    const oikawaInstanceId = s.inst("oikawa").instanceId;
    const myotismonId = s.inst("myotismon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: myotismonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === oikawaInstanceId));
    await settle(() => false, 30);

    const me = s.state.players[0]!;
    const played = me.battleArea.find((p) => p.topCard?.instanceId === myotismonId)!;
    expect(played).toBeDefined();
    // The Tamer paid itself as the cost: gone from the battle area, in the trash.
    expect(me.battleArea.some((p) => p.topCard?.cardId === CARD_ID)).toBe(false);
    expect(me.trash.map((card) => card.instanceId)).toContain(oikawaInstanceId);
    // 10 - 6 (printed play cost) + 1 (the "then" clause) = 5.
    expect(s.state.memory).toBe(5);
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    // <Rush> is real, not just a flag: the Digimon played this turn can attack at once.
    const securityBefore = s.state.players[1]!.security.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < securityBefore);
    expect(s.state.players[1]!.security.length).toBe(securityBefore - 1);

    await finish(s, loop);
  });

  it("Q5180: declining the delete cost grants no <Rush> and gains no memory", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard(
        {
          battleArea: [{ card: CARD_ID, as: "oikawa" }],
          hand: [
            { card: MYOTISMON, as: "myotismon" },
            { card: "BT1-009", as: "spare" },
          ],
        },
        {
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          battleArea: [{ card: "BT1-013", as: "victim" }],
        },
      ),
      { autoDeclineOptional: true, autoSelectCards: true },
      10,
    );
    const oikawaInstanceId = s.inst("oikawa").instanceId;
    const myotismonId = s.inst("myotismon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: myotismonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === myotismonId));
    await settle(() => false, 30);

    const me = s.state.players[0]!;
    const played = me.battleArea.find((p) => p.topCard?.instanceId === myotismonId)!;
    // Cost unpaid: the Tamer stays, no <Rush>, and — per Q5180 — no memory from "Then".
    expect(me.battleArea.some((p) => p.topCard?.instanceId === oikawaInstanceId)).toBe(true);
    expect(me.trash.some((card) => card.instanceId === oikawaInstanceId)).toBe(false);
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(false);
    expect(s.state.memory).toBe(4); // 10 - 6, and nothing else
    expect(s.state.pendingDecision).toBeUndefined();

    // Without <Rush> the freshly played Digimon may not attack.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[1]!.security).toHaveLength(NEUTRAL_SECURITY.length);

    await finish(s, loop);
  });

  it("grants <Rush> to the Myotismon that was PLAYED, not to one already on the board", async () => {
    // "1 of those Digimon" is the trigger subject. A second, established Myotismon sits on
    // the board first, so a target resolved from the plain board filter would land on it.
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [
          { card: MYOTISMON, as: "decoy" },
          { card: CARD_ID, as: "oikawa" },
        ],
        hand: [
          { card: MYOTISMON, as: "subject" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
      10,
    );
    const oikawaInstanceId = s.inst("oikawa").instanceId;
    const subjectId = s.inst("subject").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: subjectId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === oikawaInstanceId));
    await settle(() => false, 30);

    const subject = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === subjectId)!;
    expect(observe(s.engine).hasKeyword(subject, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("decoy"), "Rush")).toBe(false);
    expect(s.state.memory).toBe(5);

    await finish(s, loop);
  });

  it("does not trigger on a played Digimon without [Myotismon] in its name", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: CARD_ID, as: "oikawa" }],
        hand: [
          { card: "BT1-014", as: "other" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
      10,
    );
    const oikawaInstanceId = s.inst("oikawa").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-014"));
    await settle(() => false, 30);

    const me = s.state.players[0]!;
    const played = me.battleArea.find((p) => p.topCard?.cardId === "BT1-014")!;
    expect(me.battleArea.some((p) => p.topCard?.instanceId === oikawaInstanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(false);
    expect(s.state.memory).toBe(7); // 10 - 3, no memory gain
    await finish(s, loop);
  });

  it("triggers on a name that only CONTAINS Myotismon (VenomMyotismon)", async () => {
    // VenomMyotismon costs 12, past the turn-loop memory range, so this scenario runs on a
    // seeded Main phase with the memory armed directly. The play itself is still the public
    // `playCard` intent.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "oikawa" }],
          hand: [{ card: VENOM, as: "venom" }],
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
        },
        1: { deck: [...NEUTRAL_DECK], security: [...NEUTRAL_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const oikawaInstanceId = s.inst("oikawa").instanceId;
    const venomId = s.inst("venom").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: venomId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === oikawaInstanceId));
    await settle(() => false, 30);

    const me = s.state.players[0]!;
    const played = me.battleArea.find((p) => p.topCard?.instanceId === venomId)!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
    expect(me.trash.map((card) => card.instanceId)).toContain(oikawaInstanceId);
    expect(s.state.memory).toBe(9); // 20 - 12 + 1
  });

  it("does not trigger on the OPPONENT's Myotismon (controller: mine)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "oikawa" }],
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
        },
        1: {
          hand: [{ card: MYOTISMON, as: "theirMyotismon" }],
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // `state.memory` is always read from the CURRENT turn player's side, so seat 1 holds 8.
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();
    const oikawaInstanceId = s.inst("oikawa").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirMyotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === MYOTISMON));
    await settle(() => false, 30);

    const theirs = s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === MYOTISMON)!;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === oikawaInstanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(theirs, "Rush")).toBe(false);
    expect(s.state.memory).toBe(2); // only seat 1's own play cost of 6
  });

  it("is inert once it is in the trash: a later Myotismon play does nothing", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: CARD_ID, as: "oikawa" }],
        hand: [
          { card: MYOTISMON, as: "first" },
          { card: MYOTISMON, as: "second" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
      10,
    );
    const oikawaInstanceId = s.inst("oikawa").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === oikawaInstanceId));
    await settle(() => false, 30);
    expect(s.state.memory).toBe(5); // 10 - 6 + 1

    // The Tamer is in the TRASH now. A Tamer's effects are inert outside the battle area,
    // so the second Myotismon must get nothing and no memory may be gained.
    // The gauge is re-armed so the second play stays inside the same Main phase.
    s.state.memory = 10;
    const secondId = s.inst("second").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondId));
    await settle(() => false, 30);

    const second = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === secondId)!;
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(false);
    expect(s.state.memory).toBe(4); // 10 - 6, with no "then, gain 1 memory"
    expect(s.state.pendingDecision).toBeUndefined();

    await finish(s, loop);
  });

  it("is inert from the trash at the start of the game too", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: CARD_ID, as: "oikawa" }],
          hand: [{ card: MYOTISMON, as: "myotismon" }],
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
        },
        1: { deck: [...NEUTRAL_DECK], security: [...NEUTRAL_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const myotismonId = s.inst("myotismon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: myotismonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === myotismonId));
    await settle(() => false, 30);

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === myotismonId)!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(false);
    expect(s.state.memory).toBe(4); // 10 - 6 only
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("oikawa").instanceId)).toBe(true);
    // The EX10-048 lane saw this Tamer's watcher appear as a trigger key while it sat in the
    // trash. No decision of any kind may be raised for a trash-resident Tamer.
    expect(s.decisions).toEqual([]);
  });

  it("<Rush> lasts only for the turn", async () => {
    const { s, loop } = await runSeat0Turn(
      turnBoard({
        battleArea: [{ card: CARD_ID, as: "oikawa" }],
        hand: [
          { card: MYOTISMON, as: "myotismon" },
          { card: "BT1-009", as: "spare" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
      10,
    );
    const myotismonId = s.inst("myotismon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: myotismonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === myotismonId));
    await settle(() => false, 30);
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === myotismonId)!;
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);

    // Pass the turn through the real loop; "for the turn" expires at the turn end.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Rush")).toBe(false);
    await finish(s, loop);
  });

  it("[Security] plays itself from the security stack without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: [...NEUTRAL_DECK],
          security: [...NEUTRAL_SECURITY],
        },
        1: {
          deck: [...NEUTRAL_DECK],
          security: [{ card: CARD_ID, as: "oikawaInSecurity" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const memoryBefore = s.state.memory;
    const oikawaId = s.inst("oikawaInSecurity").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === oikawaId) || s.events.length > 400,
    );
    await settle(() => false, 30);

    const opponent = s.state.players[1]!;
    expect(opponent.battleArea.some((p) => p.topCard?.instanceId === oikawaId)).toBe(true);
    expect(opponent.trash.some((card) => card.instanceId === oikawaId)).toBe(false);
    expect(opponent.security.map((card) => card.instanceId)).not.toContain(oikawaId);
    // Free: paying the printed cost of 4 would have moved the gauge by 4 in seat 1's favour.
    expect(s.state.memory).toBe(memoryBefore);
  });
});

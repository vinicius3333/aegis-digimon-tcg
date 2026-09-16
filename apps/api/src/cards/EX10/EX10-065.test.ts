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

const CARD_ID = "EX10-065";
const MYOTISMON = "BT2-075";
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
    expect(me.battleArea.some((p) => p.topCard?.cardId === CARD_ID)).toBe(false);
    expect(me.trash.map((card) => card.instanceId)).toContain(oikawaInstanceId);
    expect(s.state.memory).toBe(5);
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

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
    expect(me.battleArea.some((p) => p.topCard?.instanceId === oikawaInstanceId)).toBe(true);
    expect(me.trash.some((card) => card.instanceId === oikawaInstanceId)).toBe(false);
    expect(observe(s.engine).hasKeyword(played, "Rush")).toBe(false);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();

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
    expect(s.state.memory).toBe(7);
    await finish(s, loop);
  });

  it("triggers on a name that only CONTAINS Myotismon (VenomMyotismon)", async () => {
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
    expect(s.state.memory).toBe(9);
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
    expect(s.state.memory).toBe(2);
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
    expect(s.state.memory).toBe(5);

    s.state.memory = 10;
    const secondId = s.inst("second").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === secondId));
    await settle(() => false, 30);

    const second = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === secondId)!;
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(false);
    expect(s.state.memory).toBe(4);
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
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("oikawa").instanceId)).toBe(true);
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
    expect(s.state.memory).toBe(memoryBefore);
  });
});

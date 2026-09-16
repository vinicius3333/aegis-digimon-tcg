import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-050.js";
import "../index.js";

const CARD_ID = "EX13-050";

const MEMORY_GAINING_DIGIMON = "BT19-029";
const MEMORY_GAINING_TAMER = "P-211";
const MEMORY_GAINING_OPTION = "ST2-13";
const BLUE_SOURCE = "BT1-027";
const INERT = "BT1-009";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014"];

describe("EX13-050 Bokomon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Bokomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mutant"],
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      effectText: "[All Turns] Players can't gain memory other than by Tamer effects.",
      inheritedEffectText: "＜Blocker＞ ",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(2);

    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "RestrictMemoryGain",
          seat: "any",
          exceptTamerEffects: true,
          duration: "permanent",
        },
      ],
    });
    expect(compiled.effects[0]?.isInherited).toBeUndefined();
    expect(compiled.effects[0]?.frequency).toBeUndefined();

    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });

    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("locks BOTH seats out of non-Tamer memory gain while leaving Tamer effects open", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "bokomon" }], deck: DECK, security: [INERT] },
      1: { deck: DECK, security: [INERT] },
    });
    await s.ready();

    for (const seat of [0, 1] as const) {
      expect(observe(s.engine).canGainMemoryFromEffect(seat, ["Digimon"])).toBe(false);
      expect(observe(s.engine).canGainMemoryFromEffect(seat, ["Option"])).toBe(false);
      expect(observe(s.engine).canGainMemoryFromEffect(seat, ["Tamer"])).toBe(true);
    }
  });

  it("releases both seats the moment the source leaves the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "bokomon" }], deck: DECK, security: [INERT] },
      1: { battleArea: [{ card: INERT, as: "sentinel" }], deck: DECK, security: [INERT] },
    });
    await s.ready();
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(false);

    await advance(s.engine).verb.deletePermanent([s.perm("bokomon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(true);
  });

  it("swallows a Digimon effect's memory gain on the live board", async () => {
    const withLock = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bokomon" }],
          hand: [{ card: MEMORY_GAINING_DIGIMON, as: "tapirmon" }],
          deck: DECK,
          security: [INERT, INERT],
        },
        1: { deck: DECK, security: [INERT] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    withLock.state.memory = 10;
    await withLock.ready();

    expect(
      withLock.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withLock.inst("tapirmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => withLock.state.players[0]!.battleArea.length === 2);

    expect(withLock.state.memory).toBe(7);
    expect(withLock.state.players[0]!.security).toHaveLength(1);
    expect(withLock.state.pendingDecision).toBeUndefined();

    const without = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT, as: "filler" }],
          hand: [{ card: MEMORY_GAINING_DIGIMON, as: "tapirmon" }],
          deck: DECK,
          security: [INERT, INERT],
        },
        1: { deck: DECK, security: [INERT] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    without.state.memory = 10;
    await without.ready();

    expect(
      without.engine.applyIntent(0, {
        type: "playCard",
        instanceId: without.inst("tapirmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => without.state.players[0]!.battleArea.length === 2);

    expect(without.state.memory).toBe(8);
    expect(without.state.players[0]!.security).toHaveLength(1);
  });

  it("still lets a Tamer effect gain memory under the lock, through the real turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "bokomon" },
            { card: MEMORY_GAINING_TAMER, as: "nanami" },
          ],
          hand: [{ card: INERT, as: "spare" }],
          deck: DECK,
          security: [INERT],
        },
        1: { battleArea: [{ card: INERT, as: "sentinel" }], deck: DECK, security: [INERT] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("keeps the turn-start memory reset, which is not an effect gain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bokomon" }],
          hand: [{ card: INERT, as: "spare" }],
          deck: DECK,
          security: [INERT],
        },
        1: {
          battleArea: [{ card: INERT, as: "sentinel" }],
          hand: [{ card: INERT, as: "spareOpponent" }],
          deck: DECK,
          security: [INERT],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);

    await advance(s.engine).runTurn(0);

    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(-3);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
  });

  it("blocks an OPTION effect's memory gain on both sides of the table", async () => {
    const play = async (withBokomon: boolean, seat: 0 | 1) => {
      const board = {
        0: {
          battleArea: withBokomon
            ? [
                { card: CARD_ID, as: "bokomon" },
                { card: BLUE_SOURCE, as: "blue0" },
              ]
            : [{ card: BLUE_SOURCE, as: "blue0" }],
          hand: [{ card: MEMORY_GAINING_OPTION, as: "spark0" }],
          deck: DECK,
          security: [INERT],
        },
        1: {
          battleArea: [{ card: BLUE_SOURCE, as: "blue1" }],
          hand: [{ card: MEMORY_GAINING_OPTION, as: "spark1" }],
          deck: DECK,
          security: [INERT],
        },
      };
      const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
      s.state.turnSeat = seat;
      s.state.memory = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "playCard",
          instanceId: s.inst(seat === 0 ? "spark0" : "spark1").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[seat]!.trash.some(({ cardId }) => cardId === MEMORY_GAINING_OPTION));
      await settle(() => s.state.pendingDecision === undefined);
      return s.state.memory;
    };

    expect(await play(false, 0)).toBe(1);
    expect(await play(true, 0)).toBe(0);
    expect(await play(false, 1)).toBe(1);
    expect(await play(true, 1)).toBe(0);
  });

  it("blocks the OPPONENT's Digimon effect gain too, on their own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bokomon" }],
          deck: DECK,
          security: [INERT],
        },
        1: {
          hand: [{ card: MEMORY_GAINING_DIGIMON, as: "tapirmon" }],
          deck: DECK,
          security: [INERT, INERT],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tapirmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not lock anything from the breeding area or from the trash", async () => {
    const inBreeding = setupEngine({
      0: { breeding: { card: CARD_ID, as: "egg" }, deck: DECK, security: [INERT] },
      1: { deck: DECK, security: [INERT] },
    });
    await inBreeding.ready();
    expect(observe(inBreeding.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
    expect(observe(inBreeding.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(true);

    const inTrash = setupEngine({
      0: { trash: [CARD_ID], battleArea: [{ card: INERT, as: "filler" }], deck: DECK, security: [INERT] },
      1: { deck: DECK, security: [INERT] },
    });
    await inTrash.ready();
    expect(observe(inTrash.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
    expect(observe(inTrash.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(true);
  });

  it("does not lock memory while it is only a digivolution card under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", under: [CARD_ID] }],
        deck: DECK,
        security: [INERT],
      },
      1: { deck: DECK, security: [INERT] },
    });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("grants ＜Blocker＞ to its inheritor, proven by intercepting a real attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", under: [CARD_ID] }],
        deck: DECK,
        security: [INERT],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: DECK, security: [INERT] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("host").permanentId],
    });

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(compiled.effects.some((effect) => effect.keywords !== undefined && effect.isInherited !== true)).toBe(false);
  });

  it("does not grant ＜Blocker＞ to its own top-card permanent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "bokomon" }], deck: DECK, security: [INERT] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: DECK, security: [INERT] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("bokomon"), "Blocker")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
  });
});

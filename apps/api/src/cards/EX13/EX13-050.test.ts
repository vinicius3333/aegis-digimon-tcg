import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-050.js";
import "../index.js";

const CARD_ID = "EX13-050";

// Fixtures.
//   BT19-029 Tapirmon — a DIGIMON whose "[On Play] By trashing your top security card, gain 1
//     memory" is the restricted kind of memory gain. Yellow Lv.3, play cost 3.
//   P-211 Nanami — a BLACK TAMER whose "[Start of Your Main Phase] If your opponent has a
//     Digimon, gain 1 memory" is the printed EXCEPTION, so it must still resolve.
//   BT1-009..BT1-014 are the inert main-deck Digimon used as filler.
const MEMORY_GAINING_DIGIMON = "BT19-029";
const MEMORY_GAINING_TAMER = "P-211";
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

    // "PLAYERS can't gain memory" is symmetric, hence seat "any" — the single field separating
    // this card from ST21-02's "your opponent can't gain memory".
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

    // ＜Blocker＞ is printed in the INHERITED box only, so there is no bare Static twin.
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });

    // No printed [Digivolve] header: the catalog EvoCost is the only structured route in.
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

    // 10 - 3 (Tapirmon's play cost). The security card is still spent — the "by" cost is paid —
    // but the memory gain itself is refused.
    expect(withLock.state.memory).toBe(7);
    expect(withLock.state.players[0]!.security).toHaveLength(1);
    expect(withLock.state.pendingDecision).toBeUndefined();

    // The same board without Bokomon is the positive control: the gain lands.
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

  it("still lets a Tamer effect gain memory under the lock", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "bokomon" },
          { card: MEMORY_GAINING_TAMER, as: "nanami" },
        ],
        deck: DECK,
        security: [INERT],
      },
      1: { battleArea: [{ card: INERT, as: "sentinel" }], deck: DECK, security: [INERT] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("nanami"));
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("grants ＜Blocker＞ only to a Digimon carrying it as a digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "topCard" },
          { card: "BT1-013", as: "host", under: [CARD_ID] },
        ],
        deck: DECK,
        security: [INERT],
      },
      1: { deck: DECK, security: [INERT] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    // The keyword is printed in the INHERITED box only, so the card's own top-card permanent
    // gains nothing from it.
    expect(compiled.effects.some((effect) => effect.keywords !== undefined && effect.isInherited !== true)).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(false);
    expect(s.perm("topCard").topCard.cardId).toBe(CARD_ID);
  });
});

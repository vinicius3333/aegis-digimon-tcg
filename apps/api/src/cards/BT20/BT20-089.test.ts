import { describe, it, expect } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-089.js";
import "./BT20-029.js";
import "./BT20-080.js";
import "./index.js";

// A3 for BT20-089 (Code Cracker Fang & Hacker Judge — Purple/Black Tamer).
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [All Turns] When any of your Digimon are played or digivolve, you may Mind Link
//   to 1 of your Digimon with [Pulsemon] text or SoC/SEEKERS trait.
// [Inherited — All Turns] This Digimon with [Pulsemon] text or SoC/SEEKERS trait
//   gains ＜Alliance＞, ＜Piercing＞ and ＜Barrier＞.
// [Inherited — End of All Turns] Play 1 [Eiji Nagasumi] from this Digimon's
//   digivolution cards without paying the cost.
//
// FAILS-WHEN-REVERTED: [Start of Your Main Phase] memory gain fires — the memory
//   increases by 1 when the opponent has a Digimon.

// BT20-089 = Code Cracker Fang & Hacker Judge
const CC_FANG = "BT20-089";
// BT1-010 = Agumon (cheap Digimon for opponent)
const AGUMON = "BT1-010";

// Give each seat cards so draw phase and main phase have something to work with.
const DECK_FILLER = Array.from({ length: 5 }, () => "BT1-010");

interface Harness {
  s: EngineSetup;
  memoryAfterStartMainPhase: number[];
}

function harness(board: BoardSpec): Harness {
  const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
  s.state.turnSeat = 0;
  s.state.isFirstPlayersFirstTurn = true;

  const memoryAfterStartMainPhase: number[] = [];
  const engineAny = s.engine as unknown as {
    fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void>;
  };
  const original = engineAny.fireTiming.bind(s.engine);
  engineAny.fireTiming = async (timing: EffectTiming, trigger?: unknown) => {
    const result = await original(timing, trigger);
    if (timing === EffectTiming.OnStartMainPhase) {
      memoryAfterStartMainPhase.push(s.state.memory);
    }
    return result;
  };

  return { s, memoryAfterStartMainPhase };
}

async function driveTurn(h: Harness, seat: Seat): Promise<void> {
  const turn = h.s.engine.runOneTurn();
  const mainPhase = (h.s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();
  h.s.engine.applyIntent(seat, { type: "endPhase" });
  await turn;
}

describe("BT20-089 Code Cracker Fang & Hacker Judge — Tamer effects", () => {
  it("keeps the Rule name treatment permanent", () => {
    const rule = compiled.effects.find((effect) => effect.trigger === "Rule");
    expect(rule?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Eiji Nagasumi", "Leon Alexander"],
      duration: "permanent",
    });
  });

  it("keeps Mind Link as a regular Tamer watcher and scopes inherited Eiji play to this stack", () => {
    const mindLinkEffect = compiled.effects.find(
      (effect) => effect.trigger === "AllTurns" && effect.actions.some((action) => action.kind === "SubTrigger"),
    );
    expect(mindLinkEffect).not.toHaveProperty("isInherited");
    expect(mindLinkEffect?.actions).toMatchObject([
      { sourceFilter: { controller: "mine", kind: ["Digimon"] } },
      { sourceFilter: { controller: "mine", kind: ["Digimon"] } },
    ]);

    const inheritedPlay = compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns");
    expect(inheritedPlay?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      fromOwnDigivolutionStack: true,
      payCost: false,
      target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "nameExact" }] } },
    });
  });

  it("[Start of Your Main Phase] gains 1 memory when opponent has a Digimon", async () => {
    const h = harness({
      // Place CC Fang on seat 0's battle area.
      0: { battleArea: [{ card: CC_FANG, dp: 3000 }], deck: DECK_FILLER, hand: ["BT1-010"] },
      // Seat 1 has an Agumon in battle area (condition: opponent has a Digimon).
      1: { battleArea: [{ card: AGUMON, dp: 2000 }], deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    h.s.state.memory = 0;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // The [Start of Your Main Phase] effect should have run and gained 1 memory.
    expect(h.memoryAfterStartMainPhase.length).toBeGreaterThanOrEqual(1);
    expect(h.memoryAfterStartMainPhase[0]).toBeGreaterThan(0);
  });

  it("[Start of Your Main Phase] does NOT gain memory when opponent has no Digimon", async () => {
    const h = harness({
      0: { battleArea: [{ card: CC_FANG, dp: 3000 }], deck: DECK_FILLER, hand: ["BT1-010"] },
      // Seat 1 has no Digimon in battle area.
      1: { deck: DECK_FILLER, hand: ["BT1-010"] },
    });

    h.s.state.memory = 0;
    h.s.state.turnSeat = 0;

    await driveTurn(h, 0);

    // Memory at OnStartMainPhase should be 0 (no gain fired).
    expect(h.memoryAfterStartMainPhase.length).toBeGreaterThanOrEqual(1);
    expect(h.memoryAfterStartMainPhase[0]).toBe(0);
  });

  it("naturally Mind Links to a qualifying Digimon when that Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CC_FANG, as: "tamer" }],
          hand: [{ card: "BT20-029", as: "pulsemon" }],
        },
        1: { deck: DECK_FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("pulsemon").stack.some((card) => card.cardId === CC_FANG));

    expect(s.perm("pulsemon").stack.map((card) => card.cardId)).toContain(CC_FANG);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CC_FANG)).toBe(false);
  });

  it("naturally grants the three inherited keywords to a qualifying linked host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-029", as: "host", under: [CC_FANG] }] },
      1: { deck: DECK_FILLER },
    });
    await s.ready();

    expect(s.perm("host").stack.map((card) => card.cardId)).toContain(CC_FANG);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("does not Mind Link when an opponent plays the qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CC_FANG, as: "tamer" }] },
        1: { hand: [{ card: "BT20-029", as: "opponentPulsemon" }], deck: DECK_FILLER },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentPulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-029"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === CC_FANG)),
    ).toBe(false);
  });
});

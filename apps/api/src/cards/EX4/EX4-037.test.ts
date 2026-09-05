import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import {
  CardColor,
  CardKind,
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX4-037.js";

const card = (id: string): CardInstance =>
  ({ cardId: id, instanceId: id, ownerSeat: 0 as Seat, faceUp: true }) as unknown as CardInstance;
const definition = (id: string, colors: CardColor[]): CardDefinition => ({
  cardId: id,
  set: "TEST",
  nameEn: id,
  kinds: [CardKind.Digimon],
  colors,
  playCost: 5,
  dp: 1000,
  level: 5,
  evoCosts: [],
  maxCountInDeck: 4,
});

describe("EX4-037 BlackMegaGargomon", () => {
  it("is represented by full residual-free IR", () => {
    expect(runtimeCompiledCard("EX4-037")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("offers the end-of-turn Blocker/Reboot effect for two green-and-black Digimon", async () => {
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: card("EX4-037"),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const first = {
      permanentId: "first",
      controllerSeat: 0,
      topCard: card("FIRST"),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const second = {
      permanentId: "second",
      controllerSeat: 0,
      topCard: card("SECOND"),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self, first, second], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map([
      ["EX4-037", definition("EX4-037", [CardColor.Green, CardColor.Black])],
      ["FIRST", definition("FIRST", [CardColor.Green, CardColor.Black])],
      ["SECOND", definition("SECOND", [CardColor.Green, CardColor.Black])],
    ]);
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat],
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, first, second].find((permanent) => permanent.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    };
    const source: CardSource = {
      instanceId: "EX4-037",
      cardId: "EX4-037",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-037")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-037")!.effectsForTiming(EffectTiming.OnEndTurn, source)[0]!;
    expect(effect.maxPerTurn).toBe(1);
    expect(await effect.canActivate?.({ source, game } as unknown as EffectContext)).toBe(true);

    const grants: unknown[][] = [];
    await effect.resolve({
      source,
      game,
      trigger: {},
      ask: { chooseTargets: async () => ["first", "second"] },
      fx: { grantKeyword: (...args: unknown[]) => grants.push(args) },
    } as unknown as EffectContext);
    expect(grants.map(([id, keyword]) => [id, keyword])).toEqual([
      ["first", "Blocker"],
      ["second", "Blocker"],
      ["first", "Reboot"],
      ["second", "Reboot"],
    ]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-037");
    expect(s.state.players[0]!.hand.some((handCard) => handCard.instanceId === s.inst("subject").instanceId)).toBe(
      false,
    );
  });

  it("unsuspends itself once when another Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-037", as: "host", suspended: true },
            { card: "BT1-064", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("other").permanentId], 0);
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("grants Blocker and Reboot only to two-color green-and-black Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-037", as: "host" },
            { card: "ST17-05", as: "valid" },
            { card: "BT1-064", as: "singleColor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.EndOfYourTurn, s.perm("host"));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("valid"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("valid"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("singleColor"), "Blocker")).toBe(false);
  });

  it("digivolves from a Rapidmon-named level-5 Digimon for the alternate cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST17-07", as: "rapidmon" }],
        hand: [{ card: "EX4-037", as: "blackMegaGargomon" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rapidmon").permanentId,
        instanceId: s.inst("blackMegaGargomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rapidmon").topCard.cardId === "EX4-037");
    expect(s.perm("rapidmon").topCard.cardId).toBe("EX4-037");
    expect(s.state.memory).toBe(0);
  });

  ex4CardBehaviorTests("EX4-037");
});

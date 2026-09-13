import "../BT16/BT16-083.js";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-050.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-054.js";
import "./BT13-055.js";
import "./BT13-059.js";
import "./BT13-100.js";

describe("BT13-050 Sunflowmon", () => {
  it("charges suspension for the Fairy digivolution and reduces its cost by two", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          optional: true,
          abortOnDecline: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "traitContains", tokens: ["Fairy"] }],
          },
          payCost: true,
          reduceCost: 2,
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              mode: "reduceCost",
              amount: 1,
              condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Green"] } },
            },
          ],
        },
      ],
    });
  });

  it("suspends itself and evolves an own Digimon into a hand Ancient Fairy for 2 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-053", as: "target" },
            { card: "BT13-050", as: "sunflow" },
          ],
          hand: [{ card: "BT16-083", as: "bigUkkomon" }],
          deck: [{ card: "BT1-009", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const targetInstanceId = s.perm("target").topCard.instanceId;
    const effect = observe(s.engine).activatableEffects(s.perm("sunflow"))[0]!;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sunflow").topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT16-083");
    expect(s.perm("target").stack.some((card) => card.instanceId === targetInstanceId)).toBe(true);
    expect(s.perm("sunflow").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
  });

  it("does not suspend or evolve when no Fairy card is available", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-050", as: "sunflow" }], hand: ["BT10-054"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseOption, s.perm("sunflow"));
    expect(s.perm("sunflow").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("may decline the Main effect without suspending or evolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-050", as: "sunflow" }], hand: [{ card: "BT13-054", as: "fairy" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const effect = observe(s.engine).activatableEffects(s.perm("sunflow"))[0]!;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sunflow").topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("sunflow").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("fairy").instanceId)).toBe(true);
  });

  it("inherited reduction applies once and resets on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-055", as: "host", under: ["BT13-050"] },
          { card: "BT13-100", as: "yoshino" },
        ],
        hand: [
          { card: "BT1-080", as: "next" },
          { card: "BT13-059", as: "later" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { hand: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
    });
    s.state.memory = 10;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("next").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-080");
    expect(s.perm("host").stack.some((card) => card.cardId === "BT13-050")).toBe(true);
    expect(s.state.memory).toBe(9);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const secondOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeSecondEvolution = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("later").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-059");
    expect(s.perm("host").stack.some((card) => card.cardId === "BT13-050")).toBe(true);
    expect(s.state.memory).toBe(beforeSecondEvolution - 3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondOwnTurn;
  });

  it("normally digivolves from a green level 3 for exactly 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-049", as: "base" }], hand: [{ card: "BT13-050", as: "sunflow" }] },
    });
    s.state.memory = 3;
    const evolutionMaterialId1 = s.perm("base").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sunflow").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("base").topCard.cardId === "BT13-050");
    expect(s.state.memory).toBe(1);
  });
});

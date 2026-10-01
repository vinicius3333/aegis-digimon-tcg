import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-088.js";
import "./BT1-093.js";

describe("BT1-088 Izzy Izumi", () => {
  it("suspends to add a revealed Digimon to hand when a level 5 green Digimon is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-088", as: "izzy" },
            { card: "BT1-078", as: "green", under: ["BT1-073"] },
          ],
          deck: [{ card: "BT1-077", as: "revealed" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.perm("izzy").isSuspended).toBe(true);
  });

  it("uses a level 5 green Digimon reached through a legal hatch/evolution/move lifecycle", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-007", as: "egg" }],
          battleArea: [{ card: "BT1-088", as: "izzy" }],
          hand: [
            { card: "BT1-066", as: "lv3" },
            { card: "BT1-073", as: "lv4" },
            { card: "BT1-078", as: "lv5" },
          ],
          deck: [{ card: "BT1-077", as: "revealed" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-007");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    for (const name of ["lv3", "lv4", "lv5"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingPermanentId,
          instanceId: s.inst(name).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst(name).instanceId);
    }
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT1-007", "BT1-066", "BT1-073"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === breedingPermanentId));

    await advance(s.engine).waitForMainPhase(0);
    const carrier = s.state.players[0]!.battleArea.find((p) => p.permanentId === breedingPermanentId)!;
    expect(carrier.topCard?.cardId).toBe("BT1-078");
    expect(carrier.stack.map((card) => card.cardId)).toEqual(["BT1-007", "BT1-066", "BT1-073"]);
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.perm("izzy").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("places a revealed non-Digimon at the bottom of the deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "izzy" }, { card: "BT1-078" }],
        deck: [{ card: "BT1-085", as: "tamer" }],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("tamer").instanceId);
  });

  it.each<[string, { battleArea?: string[]; breeding?: string }]>([
    ["a green level 4", { battleArea: ["BT1-070"] }],
    ["a non-green level 5", { battleArea: ["BT1-020"] }],
    ["a green level 5 only in the breeding area", { breeding: "BT1-078" }],
  ])("cannot activate with %s", async (_label, support) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "izzy" }, ...(support.battleArea ?? [])],
        breeding: support.breeding,
        deck: [{ card: "BT1-077", as: "top" }],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("izzy"));

    expect(s.perm("izzy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("top").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});

describe("BT1-088 Izzy Izumi — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

  const activateIzzy = (s: EngineSetup, effectKey: string) =>
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("izzy").topCard!.instanceId,
      effectKey,
    });

  it("activates [Main] during the main phase but not to interrupt an attack or another effect (Q953)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-088", as: "izzy" },
          { card: "BT1-078", as: "green" },
          { card: "BT1-010", as: "attacker" },
        ],
        hand: [{ card: "BT1-093", as: "tornado" }],
        deck: [{ card: "BT1-077", as: "revealed" }, ...FILLER],
      },
      1: {
        battleArea: [{ card: "BT1-072", as: "blocker" }],
        deck: [...FILLER],
        security: ["BT1-090", "BT1-090"],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const [izzyEffect] = observe(s.engine).activatableEffects(s.perm("izzy"));
    expect(izzyEffect).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(activateIzzy(s, izzyEffect!.effectKey)).toEqual({ ok: false, reason: "wrong-phase" });
    expect(s.perm("izzy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("revealed").instanceId);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    const tornadoId = s.inst("tornado").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tornadoId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    expect(activateIzzy(s, izzyEffect!.effectKey)).toEqual({ ok: false, reason: "decision-pending" });
    expect(s.perm("izzy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("revealed").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === tornadoId));

    expect(activateIzzy(s, izzyEffect!.effectKey)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("revealed").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.perm("izzy").isSuspended).toBe(true);
  });

  it("does not count a level 5 green Digimon in the breeding area (Q954)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-088", as: "izzy" }],
          breeding: "BT1-078",
          deck: [{ card: "BT1-077", as: "revealed" }, ...FILLER],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).activatableEffects(s.perm("izzy"))).toEqual([]);
    expect(s.perm("izzy").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("revealed").instanceId);

    s.putOnBoard(0, "BT1-078");
    await s.ready();
    const [izzyEffect] = observe(s.engine).activatableEffects(s.perm("izzy"));
    expect(izzyEffect).toBeDefined();
    expect(activateIzzy(s, izzyEffect!.effectKey)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.perm("izzy").isSuspended).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

const dpOf = (s: EngineSetup, alias: string): number => s.perm(alias).currentDP;

describe("BT19-089 Red Card — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-089")).toMatchObject({
      cardId: "BT19-089",
      nameEn: "Red Card",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
      securityEffectText: "[Security] Add this card to the hand.",
    });
    expect(getCardDefinition("BT19-089")!.effectText).toBe(
      "While your opponent has a white Digimon or Tamer, you may ignore this card's color requirements.  " +
        "[Main] Until the end of your opponent's turn, 1 of your Digimon isn't affected by the effects of " +
        "your opponent's Option cards and it can't have its DP reduced.",
    );
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-089");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            condition: {
              kind: "opponentHas",
              filter: { controllerDefault: "opponent", colors: ["White"], kind: ["Digimon", "Tamer"] },
            },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Restrict",
            restriction: "beAffected",
            fromSourceKind: ["Option"],
            byOpponentEffectsOnly: true,
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
          },
          {
            kind: "Restrict",
            restriction: "dpImmune",
            duration: "untilOpponentTurnEnd",
            target: { count: 1, sameTarget: true },
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
    ]);
    expect(
      (card?.effects[1]?.actions[1] as { byOpponentEffectsOnly?: boolean } | undefined)?.byOpponentEffectsOnly,
    ).toBeUndefined();
  });
});

describe("BT19-089 Red Card — use cost and the colour waiver", () => {
  function colourFixture(opponentBoard: string[], ownBoard: string[] = ["BT1-055"]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: opponentBoard.map((card, index) => ({ card, as: `foe${index}` })),
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    return s;
  }

  it("refuses the play with no red permanent and no white opponent permanent", async () => {
    const s = colourFixture(["BT10-008"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-089");
  });

  it("still refuses when the WHITE permanent is the caster's own (the condition is opponent-side)", async () => {
    const s = colourFixture(["BT10-008"], ["BT1-055", "EX2-047"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the colour requirement while the opponent has a white DIGIMON, and charges the printed 2", async () => {
    const s = colourFixture(["EX2-047"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT19-089");
    expect(s.events.find((event) => event.kind === "actionRejected")).toBeUndefined();
  });

  it("waives the colour requirement while the opponent has a white TAMER", async () => {
    const s = colourFixture(["BT12-098"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));
    expect(s.state.memory).toBe(1);
  });

  it("needs no waiver at all once the caster has a red permanent", async () => {
    const s = colourFixture(["BT10-008"], ["BT1-013"]);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));
    expect(s.state.memory).toBe(1);
  });
});

describe("BT19-089 Red Card — [Main] protection into the opponent's turn", () => {
  async function protectThenOpponentPlays(
    opponentCard: string,
    protect = true,
  ): Promise<{ s: EngineSetup; loop: Promise<unknown> }> {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: [
            { card: "BT1-013", as: "chosen" },
            { card: "BT1-013", as: "peer" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: opponentCard, as: "weapon" }, "BT1-009"],
          battleArea: [{ card: "BT1-055", as: "anchor" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    prefer.push(s.perm("chosen").topCard!.instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const grant = protect
      ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })
      : { ok: true };
    expect(grant).toEqual({ ok: true });
    await settle(
      () => !protect || s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId),
    );
    expect(dpOf(s, "chosen")).toBe(5000);
    expect(dpOf(s, "peer")).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("weapon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    return { s, loop };
  }

  it("shrugs off an opponent OPTION that would reduce DP, while the untargeted peer takes it", async () => {
    const { s, loop } = await protectThenOpponentPlays("BT2-097");
    expect(dpOf(s, "peer")).toBe(1000);
    expect(dpOf(s, "chosen")).toBe(5000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses a DP reduction from a non-Option opponent source too (the DP half is unqualified)", async () => {
    const { s, loop } = await protectThenOpponentPlays("BT5-035");
    expect(dpOf(s, "chosen")).toBe(5000);
    expect(dpOf(s, "peer")).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("CONTROL: the same non-Option reduction lands when Red Card is never played", async () => {
    const { s, loop } = await protectThenOpponentPlays("BT5-035", false);
    expect(dpOf(s, "chosen")).toBe(3000);
    expect(dpOf(s, "peer")).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  async function opponentDeletionRun(protect: boolean): Promise<{
    s: EngineSetup;
    loop: Promise<unknown>;
    chosenInstance: string;
    peerInstance: string;
  }> {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: [
            { card: "BT1-013", as: "chosen", dp: 4000 },
            { card: "BT1-013", as: "peer", dp: 4000 },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: "BT2-091", as: "weapon" }, "BT1-009"],
          battleArea: [{ card: "BT10-008", as: "anchor" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    prefer.push(s.perm("chosen").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const chosenInstance = s.perm("chosen").topCard!.instanceId;
    const peerInstance = s.perm("peer").topCard!.instanceId;

    const grant = protect
      ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })
      : { ok: true };
    expect(grant).toEqual({ ok: true });
    await settle(
      () => !protect || s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId),
    );
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("weapon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    return { s, loop, chosenInstance, peerInstance };
  }

  it("blocks a NON-DP opponent Option effect: the chosen Digimon is not deleted", async () => {
    const { s, loop, chosenInstance, peerInstance } = await opponentDeletionRun(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId).sort()).toEqual(
      [chosenInstance, peerInstance].sort(),
    );
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT2-091");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("CONTROL: the same Option deletes the chosen Digimon when Red Card is never played", async () => {
    const { s, loop, chosenInstance, peerInstance } = await opponentDeletionRun(false);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([peerInstance]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(chosenInstance);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("CONTROL: the opponent Option reduction lands on BOTH Digimon when Red Card is never played", async () => {
    const { s, loop } = await protectThenOpponentPlays("BT2-097", false);
    expect(dpOf(s, "chosen")).toBe(1000);
    expect(dpOf(s, "peer")).toBe(1000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-089 Red Card — Q3158: an existing DP reduction is undone", () => {
  it("restores a Digimon whose DP was already reduced this turn", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-089", as: "red" }, "BT1-009"],
          battleArea: [
            { card: "BT1-013", as: "chosen" },
            { card: "BT1-009", as: "attacker", dp: 20_000 },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          deck: [...FILLER],
          security: [{ card: "BT2-097", as: "crevasse" }, "BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    prefer.push(s.perm("chosen").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(dpOf(s, "chosen")).toBe(5000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => dpOf(s, "chosen") === 1000);

    expect(dpOf(s, "chosen")).toBe(1000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("red").instanceId));

    expect(dpOf(s, "chosen")).toBe(5000);
    expect(dpOf(s, "attacker")).toBe(16_000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.find((event) => event.kind === "actionRejected")).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-089 Red Card — [Security] add this card to the hand", () => {
  it("reaches the defender's hand out of a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 20_000 }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          deck: [...FILLER],
          security: [{ card: "BT19-089", as: "red" }, "BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("red").instanceId));

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("red").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain("BT19-089");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

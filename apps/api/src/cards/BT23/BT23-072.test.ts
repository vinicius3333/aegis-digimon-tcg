import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import {
  settle,
  setupEngine,
  type BoardSpec,
  type EngineSetup,
  type SeatSpec,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-072.js";

const KEYWORDS = ["Rush", "Raid", "Reboot", "Blocker"] as const;

/** The [Hand] [Main] effect key, read off the real declaration window for the hand card. */
function mainEffectKey(s: EngineSetup, alias = "handDrasil"): string {
  const source = (s.engine as any).cardSourceOf(s.inst(alias));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-072/"))!
    .effectKey;
}

function keywordsOn(s: EngineSetup, alias: string): boolean[] {
  return KEYWORDS.map((keyword) => observe(s.engine).hasKeyword(s.perm(alias), keyword));
}

/** A board where seat 0 can publicly play cards through the real turn loop. */
function playableBoard(seat0: SeatSpec, seat1: SeatSpec = {}): BoardSpec {
  return {
    0: { deck: ["BT1-011", "BT1-012", "BT1-013"], security: 3, ...seat0 },
    1: { deck: ["BT1-011", "BT1-012", "BT1-013"], security: 3, ...seat1 },
  };
}

async function openMain(board: BoardSpec, opts: SetupEngineOptions) {
  const s = setupEngine(board, opts);
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

async function closeLoop(s: EngineSetup, loop: Promise<unknown>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT23-072 King Drasil_7D6", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-072")).toMatchObject({
      cardId: "BT23-072",
      nameEn: "King Drasil_7D6",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 6,
      dp: 9000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["9000", "CS"],
    });
    const printed = (text: string): string => text.replace(/\u00a0/g, " ");
    const definition = getCardDefinition("BT23-072")!;
    expect(printed(definition.effectText ?? "")).toBe(
      "[Hand] [Main] By paying 3 cost and placing this card as the bottom digivolution card of your " +
        "[King Drasil_7D6] or [Mother Eater] in the breeding area, ＜Draw 1＞ \n" +
        "[All Turns] When any of your Digimon with the [Royal Knight] or [CS] trait are played, by " +
        "suspending this Digimon, 1 of the played Digimon gains ＜Rush＞ , ＜Raid＞ , ＜Reboot＞ and " +
        "＜Blocker＞ until your opponent's turn ends.",
    );
    expect(printed(definition.inheritedEffectText ?? "")).toBe(
      "[Breeding] [Start of Your Main Phase] If this Digimon has 6 or more digivolution cards, you may " +
        "play 1 Digimon card with [King Drasil] in its name from its digivolution cards without paying the cost.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  // Clause 1 — [Hand] [Main].

  it("pays 3, places this hand card at the Mother Eater stack bottom, then draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", under: ["BT23-003"], as: "mother" },
          hand: [{ card: "BT23-072", as: "handDrasil" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const drasilId = s.inst("handDrasil").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const bottomBefore = s.perm("mother").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: drasilId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mother").stack.some((card) => card.instanceId === drasilId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("mother").stack.map((card) => card.instanceId)).toEqual([drasilId, bottomBefore]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === drawnId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also accepts the [King Drasil_7D6] Digi-Egg as the breeding host", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "king" },
          hand: [{ card: "BT23-072", as: "handDrasil" }],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const drasilId = s.inst("handDrasil").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: drasilId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("king").stack.some((card) => card.instanceId === drasilId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("king").stack.map((card) => card.instanceId)).toEqual([drasilId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  // Q5345: no [King Drasil_7D6] / [Mother Eater] in breeding means no activation at all.
  it("refuses activation with no King Drasil_7D6 or Mother Eater in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-003", as: "motimon" },
          hand: [{ card: "BT23-072", as: "handDrasil" }],
          deck: [{ card: "BT1-009", as: "notDrawn" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const drasilId = s.inst("handDrasil").instanceId;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: drasilId,
      effectKey: mainEffectKey(s),
    });
    await settle(() => false, 40);

    expect(result.ok).toBe(false);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drasilId]);
    expect(s.perm("motimon").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
    expect(s.decisions).toHaveLength(0);
  });

  // Q5345 sharpened: the empty breeding area is the same refusal, not a silent no-op draw.
  it("refuses activation with an empty breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-072", as: "handDrasil" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("handDrasil").instanceId,
      effectKey: mainEffectKey(s),
    });
    await settle(() => false, 40);

    expect(result.ok).toBe(false);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("refuses the [Main] activation on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", as: "mother" },
          hand: [{ card: "BT23-072", as: "handDrasil" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -5;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("handDrasil").instanceId,
      effectKey: mainEffectKey(s),
    });
    await settle(() => false, 40);

    expect(result.ok).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("mother").stack).toHaveLength(0);
  });

  // Q5346: the "by" cost is all-or-nothing — declining pays nothing and draws nothing.
  it("pays no memory and draws nothing when the controller declines the placement", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-007", under: ["BT23-003"], as: "mother" },
          hand: [{ card: "BT23-072", as: "handDrasil" }],
          deck: [{ card: "BT1-009", as: "notDrawn" }, "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const drasilId = s.inst("handDrasil").instanceId;

    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: drasilId,
      effectKey: mainEffectKey(s),
    });
    await settle(() => false, 60);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drasilId]);
    expect(s.decisions.some((entry) => entry.req.kind === "optional")).toBe(true);
    expect(s.perm("mother").stack).toHaveLength(1);
    expect(s.perm("mother").stack.some((card) => card.instanceId === drasilId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Clause 2 — [All Turns] played-Digimon watcher.

  it("suspends itself and grants all four keywords when an own CS Digimon is played", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        battleArea: [{ card: "BT23-072", as: "drasil" }],
        hand: [
          { card: "BT23-062", as: "played" },
          { card: "ST1-02", as: "neutral" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    s.perm("drasil").isSuspended = false;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("drasil").isSuspended);

    expect(s.perm("drasil").isSuspended).toBe(true);
    expect(keywordsOn(s, "played")).toEqual([true, true, true, true]);
    expect(keywordsOn(s, "drasil")).toEqual([false, false, false, false]);
    expect(s.state.pendingDecision).toBeUndefined();
    await closeLoop(s, loop);
  });

  // Q5347: the watcher also sees this card's own play (BT23-072 itself has the [CS] trait).
  it("triggers on its own play and grants the four keywords to itself", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        hand: [
          { card: "BT23-072", as: "drasil" },
          { card: "ST1-02", as: "neutral" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drasil").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-072"));
    expect(s.perm("drasil").isSuspended).toBe(true);
    expect(keywordsOn(s, "drasil")).toEqual([true, true, true, true]);
    await closeLoop(s, loop);
  });

  it("ignores an own played Digimon with neither the Royal Knight nor the CS trait", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        battleArea: [{ card: "BT23-072", as: "drasil" }],
        hand: [
          { card: "BT1-009", as: "played" },
          { card: "ST1-02", as: "neutral" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    s.perm("drasil").isSuspended = false;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"));

    expect(s.perm("drasil").isSuspended).toBe(false);
    expect(keywordsOn(s, "played")).toEqual([false, false, false, false]);
    expect(s.decisions.filter((entry) => entry.req.kind === "optional")).toHaveLength(0);
    await closeLoop(s, loop);
  });

  it("ignores a CS Digimon played by the opponent", async () => {
    const s = setupEngine(
      playableBoard(
        { battleArea: [{ card: "BT23-072", as: "drasil" }], hand: ["ST1-02"] },
        { hand: [{ card: "BT23-062", as: "played" }, "ST1-02"] },
      ),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.perm("drasil").isSuspended = false;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = -5;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-062"));

    expect(s.perm("drasil").isSuspended).toBe(false);
    expect(keywordsOn(s, "played")).toEqual([false, false, false, false]);
    await closeLoop(s, loop);
  });

  it("keeps the played Digimon unchanged when the controller refuses the suspension cost", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        battleArea: [{ card: "BT23-072", as: "drasil" }],
        hand: [
          { card: "BT23-062", as: "played" },
          { card: "ST1-02", as: "neutral" },
        ],
      }),
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    s.perm("drasil").isSuspended = false;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT23-062"));
    await settle(() => false, 40);

    expect(s.decisions.some((entry) => entry.req.kind === "optional")).toBe(true);
    expect(s.perm("drasil").isSuspended).toBe(false);
    expect(keywordsOn(s, "played")).toEqual([false, false, false, false]);
    await closeLoop(s, loop);
  });

  it("keeps the grants through the opponent's turn and drops them once that turn ends", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        battleArea: [{ card: "BT23-072", as: "drasil" }],
        hand: [
          { card: "BT23-062", as: "played" },
          { card: "ST1-02", as: "neutral" },
        ],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    s.perm("drasil").isSuspended = false;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("drasil").isSuspended);
    expect(keywordsOn(s, "played")).toEqual([true, true, true, true]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(keywordsOn(s, "played")).toEqual([true, true, true, true]);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(keywordsOn(s, "played")).toEqual([false, false, false, false]);
    await closeLoop(s, loop);
  });

  // Clause 3 — inherited [Breeding] [Start of Your Main Phase].

  it("plays a King Drasil card from its own stack for free at six or more digivolution cards", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        breeding: {
          card: "BT22-007",
          under: [
            { card: "BT23-072", as: "freePlay" },
            "BT23-003",
            "BT23-003",
            "BT23-003",
            "BT23-003",
            { card: "BT23-072", as: "inherited" },
          ],
          as: "mother",
        },
        hand: ["ST1-02"],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("freePlay").instanceId),
    );

    const memoryAfter = s.state.memory;
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("freePlay").instanceId),
    ).toBe(true);
    expect(s.perm("mother").stack.map((card) => card.cardId)).toEqual([
      "BT23-003",
      "BT23-003",
      "BT23-003",
      "BT23-003",
      "BT23-072",
    ]);
    expect(memoryAfter).toBeGreaterThanOrEqual(0);
    await closeLoop(s, loop);
  });

  it("does not fire at five digivolution cards", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        breeding: {
          card: "BT22-007",
          under: ["BT23-072", "BT23-003", "BT23-003", "BT23-003", "BT23-072"],
          as: "mother",
        },
        hand: ["ST1-02"],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await settle(() => false, 60);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("mother").stack).toHaveLength(5);
    await closeLoop(s, loop);
  });

  // Q5348: a {Breeding} effect cannot be activated outside the breeding area.
  it("does not fire while the same stack sits in the battle area", async () => {
    const { s, loop } = await openMain(
      playableBoard({
        battleArea: [
          {
            card: "BT22-043",
            under: ["BT23-072", "BT23-003", "BT23-003", "BT23-003", "BT23-003", "BT23-072"],
            as: "host",
          },
        ],
        hand: ["ST1-02"],
      }),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await settle(() => false, 60);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(6);
    await closeLoop(s, loop);
  });

  // IR shape — the clauses the behavioral tests pin, stated once.

  it("compiles the [Hand] [Main] cost as an exact-name placement plus 3 memory", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: {
          filter: {
            controller: "mine",
            zone: "breeding",
            nameOrTrait: [{ tokens: ["King Drasil_7D6", "Mother Eater"], match: "nameExact" }],
          },
        },
      },
      additionalCosts: [{ kind: "payMemory", memory: 3 }],
    });
  });

  it("anchors all four keyword grants to the played Royal Knight/CS Digimon", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher).toMatchObject({
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Royal Knight", "CS"], match: "trait" }],
      },
    });
    expect(watcher.actions.map((action: any) => action.keyword.keyword)).toEqual([...KEYWORDS]);
    expect(watcher.actions.every((action: any) => action.duration === "untilOpponentTurnEnd")).toBe(true);
    expect(watcher.actions[0].target.sourceRef).toBe("triggerSubject");
    expect(watcher.actions[0].cost).toMatchObject({ kind: "suspend", target: { filter: { isSelfRef: true } } });
    expect(watcher.actions.slice(1).every((action: any) => action.target.sameTarget === true)).toBe(true);
  });

  it("marks the free-play clause inherited, breeding-only and substring-name matched", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any;
    expect(effect).toMatchObject({ isInherited: true, isBreeding: true });
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
      fromOwnDigivolutionStack: true,
      from: ["digivolutionCards"],
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["King Drasil"], match: "name" }] },
      },
      condition: { kind: "selfDigivolutionCountAtLeast", value: 6 },
    });
  });
});

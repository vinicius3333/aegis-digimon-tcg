import { getCardDefinition } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter/compiledCards.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import type { BoardSpec, EngineSetup, PermanentSpec, SeatSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-037.js";
import "./index.js";
import "../ST1/ST1-15.js";
import "./BT20-041.js";
import "../BT16/BT16-036.js";
import "../ST5/ST5-15.js";
import "../BT2/BT2-107.js";
import "../BT14/BT14-075.js";
import "../BT18/BT18-049.js";
import "../BT18/BT18-066.js";
import "../EX5/EX5-059.js";
import "../BT4/BT4-093.js";
import "../BT24/BT24-013.js";
import "../EX10/EX10-045.js";
import "../EX9/EX9-041.js";
import "../EX9/EX9-073.js";

describe("BT20-037 Chaosmon: Valdur Arm", () => {
  it("scales suspension and memory by level 6 stack cards, then disables opponent On Play and unsuspend", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
          scaling: { per: 1, unit: "digivolutionCards", filter: { levels: [6] } },
        },
        { kind: "GainMemory", amount: 1, scaling: { per: 1, unit: "digivolutionCards", filter: { levels: [6] } } },
        {
          kind: "DisableTimingEffect",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" },
          timings: ["onPlay"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" },
        },
      ],
    });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toHaveLength(2);
  });

  it("publishes Valdur Arm's catalog identity and only its printed normal evolution routes", () => {
    expect(getCardDefinition("BT20-037")).toMatchObject({
      cardId: "BT20-037",
      nameEn: "Chaosmon: Valdur Arm",
      colors: ["Yellow", "Green"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Yellow", level: 6, memoryCost: 5 },
        { color: "Green", level: 6, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Unique"],
    });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("scales from two level-6 sources and locks every opposing Digimon and Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", under: ["BT20-036"], as: "base" }],
          hand: [{ card: "BT20-037", as: "valdur" }],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "digimon" },
            { card: "BT20-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("digimon").isSuspended && s.perm("tamer").isSuspended && s.state.memory === 7);
    for (const alias of ["digimon", "tamer"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
      expect(observe(s.engine).timingEffectDisabled(s.perm(alias), "onPlay")).toBe(true);
    }
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Partition")).toBe(true);
  });

  it("suspends exactly one opposing Digimon or Tamer per level-6 source and leaves allied cards untouched", async () => {
    const s = setupEngine(
      {
        1: {
          battleArea: [
            { card: "BT20-010", as: "opponentDigimon" },
            { card: "BT20-011", as: "opponentDigimonTwo" },
            { card: "BT20-085", as: "opponentTamer" },
          ],
        },
        0: {
          battleArea: [
            { card: "BT20-035", as: "base", under: ["BT20-036"] },
            { card: "BT20-010", as: "ally" },
          ],
          hand: [{ card: "BT20-037", as: "valdur" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 7 &&
        [s.perm("opponentDigimon"), s.perm("opponentDigimonTwo"), s.perm("opponentTamer")].filter((p) => p.isSuspended)
          .length === 2,
    );
    expect(
      [s.perm("opponentDigimon"), s.perm("opponentDigimonTwo"), s.perm("opponentTamer")].filter((p) => p.isSuspended),
    ).toHaveLength(2);
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it("keeps the selected opposing cards suspended through their turn, then expires the lock at turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", as: "base", under: ["BT20-036"] }],
          hand: [{ card: "BT20-037", as: "valdur" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "opponentDigimon" },
            { card: "BT20-011", as: "opponentDigimonTwo" },
            { card: "BT1-085", as: "opponentTamer" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentDigimon").permanentId, s.perm("opponentDigimonTwo").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        [s.perm("opponentDigimon"), s.perm("opponentDigimonTwo"), s.perm("opponentTamer")].filter(
          (permanent) => permanent.isSuspended,
        ).length === 2,
    );
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentDigimonTwo").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("publicly suppresses an opposing Digimon's On Play effect while the lock is active", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", as: "base", under: ["BT20-036"] }],
          hand: [{ card: "BT20-037", as: "valdur" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "target" },
            { card: "BT20-085", as: "tamer" },
          ],
          hand: [{ card: "BT20-030", as: "played" }],
          deck: ["BT1-010", { card: "BT20-031", as: "wouldReveal" }, "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT20-030"));
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("wouldReveal").instanceId)).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("publicly checks two security cards with Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-037", as: "valdur" }] },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("valdur").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("reaches Valdur Arm through a public level-6 evolution and rejects a lower-level base", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-035", as: "levelSix" }], hand: [{ card: "BT20-037", as: "valdur" }] },
      1: { battleArea: [{ card: "BT20-010", as: "target" }] },
    });
    legal.state.memory = 10;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("levelSix").permanentId,
        instanceId: legal.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("levelSix").topCard.cardId === "BT20-037");
    expect(legal.perm("levelSix").stack.map((card) => card.cardId)).toEqual(["BT20-035"]);
    expect(legal.state.memory).toBe(6);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT20-034", as: "levelFive" }], hand: [{ card: "BT20-037", as: "valdur" }] },
    });
    invalid.state.memory = 10;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("levelFive").permanentId,
        instanceId: invalid.inst("valdur").instanceId,
      }).ok,
    ).toBe(false);
    expect(invalid.perm("levelFive").topCard.cardId).toBe("BT20-034");
  });

  it("reaches Valdur Arm from two legal level-6 cards after a public DNA and De-Digivolve sequence", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-035", as: "yellowSix" },
            { card: "BT20-036", as: "blackSix" },
          ],
          hand: [
            { card: "BT16-036", as: "dna" },
            { card: "BT20-037", as: "valdur" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-046", dp: 10000, as: "blackSource" }],
          hand: [{ card: "ST5-15", as: "deDigi" }],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-036"));
    const dnaPermanent = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT16-036")!;
    expect(dnaPermanent.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-035", "BT20-036"]));

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deDigi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-035" || p.topCard.cardId === "BT20-036"),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const finalOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const exposed = s.state.players[0]!.battleArea.find((p) => ["BT20-035", "BT20-036"].includes(p.topCard.cardId))!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: exposed.permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-037"));
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-037")!.stack.map((card) => card.cardId),
    ).toEqual(expect.arrayContaining(["BT20-035", "BT20-036"]));
    advance(s.engine).endMainPhaseIfOpen(0);
    await finalOwnTurn;
  });

  it("Partitions its specified yellow and green/black level-6 sources after opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-037", under: ["BT20-035", "BT20-036"], as: "valdur" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("valdur").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-035") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-036"),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("naturally partitions both legal level-6 sources after an opponent Option deletes Valdur Arm", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-037",
              dp: 4000,
              under: [
                { card: "BT20-035", as: "yellowSource" },
                { card: "BT20-036", as: "greenBlackSource" },
              ],
              as: "valdur",
            },
          ],
        },
        1: {
          hand: [{ card: "ST1-15", as: "deletionOption" }],
          battleArea: [{ card: "BT20-010", dp: 5000, as: "redSource" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletionOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT20-035",
      "BT20-036",
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT20-037");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST1-15");
  });

  it("may refuse Partition after a public opponent deletion, sending the full Valdur stack to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT20-037",
              dp: 4000,
              under: [
                { card: "BT20-035", as: "yellowSource" },
                { card: "BT20-036", as: "greenBlackSource" },
              ],
              as: "valdur",
            },
          ],
        },
        1: {
          hand: [{ card: "ST1-15", as: "deletionOption" }],
          battleArea: [{ card: "BT20-010", dp: 5000, as: "redSource" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletionOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetDecision = s.state.pendingDecision!;
    const targetRequest = s.decisions.find(({ req }) => req.decisionId === targetDecision.decisionId)!.req;
    if (targetRequest.kind !== "chooseTargets") throw new Error("Expected ST1-15 target decision");
    expect(targetRequest.options?.candidateInstanceIds).toContain(s.perm("valdur").permanentId);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("valdur").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const partitionDecision = s.state.pendingDecision!;
    const partitionRequest = s.decisions.find(({ req }) => req.decisionId === partitionDecision.decisionId)!.req;
    if (partitionRequest.kind !== "selectCards") throw new Error("Expected Partition selection decision");
    expect(partitionRequest.options?.candidateInstanceIds).toEqual([s.inst("yellowSource").instanceId]);
    expect(partitionRequest.options?.min).toBe(0);
    expect(partitionRequest.options?.max).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: partitionDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        ["BT20-037", "BT20-035", "BT20-036"].every((cardId) =>
          s.state.players[0]!.trash.some((card) => card.cardId === cardId),
        ) &&
        s.state.players[1]!.trash.some((card) => card.cardId === "ST1-15"),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-037", "BT20-035", "BT20-036"]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST1-15");
  });

  it("partitions after an inherited public DP reduction deletes Valdur at 0 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-037", dp: 4000, suspended: true, under: ["BT20-035", "BT20-036"], as: "valdur" }],
        },
        1: { battleArea: [{ card: "BT20-042", as: "attacker", under: ["BT20-041"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("valdur").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT20-035",
      "BT20-036",
    ]);
  });
});

describe("BT20-037 Chaosmon: Valdur Arm — KB Q&A rulings", () => {
  const filler = ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"];

  function valdurBoard(opponent: SeatSpec, levelSixSources: 1 | 2 = 1, ownOthers: PermanentSpec[] = []): BoardSpec {
    const base: PermanentSpec =
      levelSixSources === 2
        ? { card: "BT20-035", under: ["BT20-036"], as: "valdurBase" }
        : { card: "BT20-035", as: "valdurBase" };
    return {
      0: {
        battleArea: [base, ...ownOthers],
        hand: [{ card: "BT20-037", as: "valdur" }],
        security: ["BT1-010"],
        deck: filler,
      },
      1: { deck: filler, ...opponent },
    };
  }

  function preferPermanent(preferred: string[], s: EngineSetup, alias: string): void {
    preferred.push(s.perm(alias).permanentId, s.perm(alias).topCard.instanceId);
  }

  async function digivolveIntoValdurArm(s: EngineSetup, levelSixSources: number): Promise<void> {
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("valdurBase").permanentId,
        instanceId: s.inst("valdur").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 5 + levelSixSources &&
        s.state.players[1]!.battleArea.every((permanent) =>
          observe(s.engine).timingEffectDisabled(permanent, "onPlay"),
        ),
    );
  }

  async function startOpponentMainPhase(s: EngineSetup): Promise<{ finish: () => Promise<void> }> {
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    return {
      finish: async () => {
        advance(s.engine).endMainPhaseIfOpen(1);
        await turn;
      },
    };
  }

  function suspendedOpponentPermanents(s: EngineSetup): number {
    return s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended).length;
  }

  it("suspends 1 opposing Digimon or Tamer and gains 1 memory for each level-6 digivolution card (Q4347)", async () => {
    const opponent: SeatSpec = {
      battleArea: [
        { card: "BT20-010", as: "first" },
        { card: "BT20-011", as: "second" },
        { card: "BT1-085", as: "tamer" },
      ],
    };
    const twoSources = setupEngine(valdurBoard(opponent, 2), { autoSelectCards: true });
    await digivolveIntoValdurArm(twoSources, 2);
    expect(
      twoSources.perm("valdurBase").stack.filter((card) => getCardDefinition(card.cardId)?.level === 6),
    ).toHaveLength(2);
    expect(suspendedOpponentPermanents(twoSources)).toBe(2);
    expect(twoSources.state.memory).toBe(7);

    const oneSource = setupEngine(valdurBoard(opponent, 1), { autoSelectCards: true });
    await digivolveIntoValdurArm(oneSource, 1);
    expect(suspendedOpponentPermanents(oneSource)).toBe(1);
    expect(oneSource.state.memory).toBe(6);
  });

  it("stops an opposing Digimon's [On Play] from triggering when it is played during the lock (Q4348)", async () => {
    const locked = setupEngine(
      valdurBoard({ battleArea: [{ card: "BT1-085", as: "tamer" }], hand: [{ card: "BT14-075", as: "devimon" }] }),
      { autoSelectCards: true },
    );
    await digivolveIntoValdurArm(locked, 1);
    const playDevimon = async (s: EngineSetup) => {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("devimon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-075"));
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
    };

    const opponentTurn = await startOpponentMainPhase(locked);
    const deckBeforePlay = locked.state.players[1]!.deck.length;
    await playDevimon(locked);
    expect(locked.state.players[1]!.deck).toHaveLength(deckBeforePlay);
    expect(locked.state.players[1]!.trash).toHaveLength(0);
    await opponentTurn.finish();

    const unlocked = setupEngine(
      { 1: { hand: [{ card: "BT14-075", as: "devimon" }], deck: filler } },
      { autoSelectCards: true },
    );
    unlocked.state.turnSeat = 1;
    unlocked.state.memory = 10;
    await unlocked.ready();
    await playDevimon(unlocked);
    expect(unlocked.state.players[1]!.trash).toHaveLength(3);
    expect(unlocked.state.players[1]!.deck).toHaveLength(filler.length - 3);
  });

  it("still lets an opposing [On Play] [When Attacking] effect activate on the attack timing (Q4349)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      valdurBoard({
        battleArea: [
          { card: "BT14-075", as: "devimon" },
          { card: "BT1-085", as: "tamer" },
        ],
      }),
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferPermanent(preferred, s, "tamer");
    await digivolveIntoValdurArm(s, 1);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("devimon").isSuspended).toBe(false);

    const opponentTurn = await startOpponentMainPhase(s);
    expect(observe(s.engine).timingEffectDisabled(s.perm("devimon"), "onPlay")).toBe(true);
    const deckBeforeAttack = s.state.players[1]!.deck.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("devimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === deckBeforeAttack - 3);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.deck).toHaveLength(deckBeforeAttack - 3);
    await opponentTurn.finish();
  });

  it("stops an opposing Digimon from activating its own [On Play] through an effect (Q4350)", async () => {
    const dobermonBoard: SeatSpec = {
      battleArea: [{ card: "BT14-071", under: ["BT4-082"], as: "dobermonBase" }],
      hand: [{ card: "EX5-059", as: "dobermonX" }, "BT1-010"],
    };
    const digivolveIntoDobermonX = async (s: EngineSetup) => {
      const trashBefore = s.state.players[1]!.trash.length;
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("dobermonBase").permanentId,
          instanceId: s.inst("dobermonX").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.perm("dobermonBase").topCard.cardId === "EX5-059" && s.state.players[1]!.trash.length === trashBefore + 1,
      );
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
    };

    const locked = setupEngine(valdurBoard(dobermonBoard), { autoSelectCards: true, autoAcceptOptional: true });
    await digivolveIntoValdurArm(locked, 1);
    const opponentTurn = await startOpponentMainPhase(locked);
    const deckBeforeDigivolve = locked.state.players[1]!.deck.length;
    await digivolveIntoDobermonX(locked);
    const digivolutionBonusDraw = 1;
    const whenDigivolvingDraw = 1;
    expect(locked.state.players[1]!.deck).toHaveLength(
      deckBeforeDigivolve - digivolutionBonusDraw - whenDigivolvingDraw,
    );
    expect(observe(locked.engine).hasKeyword(locked.perm("dobermonBase"), "Retaliation")).toBe(false);
    await opponentTurn.finish();

    const unlocked = setupEngine({ 1: { ...dobermonBoard, deck: filler } }, { autoSelectCards: true });
    unlocked.state.turnSeat = 1;
    unlocked.state.memory = 10;
    await unlocked.ready();
    await digivolveIntoDobermonX(unlocked);
    expect(observe(unlocked.engine).hasKeyword(unlocked.perm("dobermonBase"), "Retaliation")).toBe(true);
  });

  it("stops an opposing Digimon from activating another card's [On Play] as its own effect (Q4351)", async () => {
    const preferred: string[] = [];
    const sephirothmonBoard: SeatSpec = {
      battleArea: [
        { card: "BT1-030", as: "target" },
        { card: "BT18-064", as: "sephirothmonBase" },
      ],
      hand: [{ card: "BT18-066", as: "sephirothmon" }],
      trash: [{ card: "BT18-049", as: "hybrid", faceUp: true }],
    };
    const digivolveIntoSephirothmon = async (s: EngineSetup) => {
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          permanentId: s.perm("sephirothmonBase").permanentId,
          instanceId: s.inst("sephirothmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.perm("sephirothmonBase").stack.some((card) => card.instanceId === s.inst("hybrid").instanceId),
      );
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
    };

    const locked = setupEngine(valdurBoard(sephirothmonBoard), {
      autoSelectCards: true,
      autoAcceptOptional: true,
      preferInstanceIds: preferred,
    });
    await digivolveIntoValdurArm(locked, 1);
    const opponentTurn = await startOpponentMainPhase(locked);
    preferPermanent(preferred, locked, "target");
    const lockedTargetDP = locked.perm("target").currentDP;
    await digivolveIntoSephirothmon(locked);
    expect(locked.perm("sephirothmonBase").topCard.cardId).toBe("BT18-066");
    expect(locked.perm("target").currentDP).toBe(lockedTargetDP);
    await opponentTurn.finish();

    const unlockedPreferred: string[] = [];
    const unlocked = setupEngine(
      { 1: { ...sephirothmonBoard, deck: filler } },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: unlockedPreferred },
    );
    unlocked.state.turnSeat = 1;
    unlocked.state.memory = 10;
    await unlocked.ready();
    preferPermanent(unlockedPreferred, unlocked, "target");
    const unlockedTargetDP = unlocked.perm("target").currentDP;
    await digivolveIntoSephirothmon(unlocked);
    expect(unlocked.perm("target").currentDP).toBe(unlockedTargetDP + 3000);
  });

  it("lets an unaffected card activate a locked Digimon's [On Play] as an effect of itself (Q4352)", async () => {
    // No printed card lets a non-Digimon, non-Tamer card borrow a battle-area Digimon's
    // [On Play] "as an effect of this card", so an Option probe stands in for one.
    const optionId = "BT2-107";
    const printedOption = runtimeCompiledCard(optionId);
    if (printedOption === undefined) throw new Error(`Expected ${optionId} to be registered`);
    const borrowingOption: CompiledCard = {
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "ActivateEffect",
              asEffectOf: "this card",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              effectType: "OnPlay",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    };
    registerIrCard(optionId, borrowingOption);
    try {
      const unlocked = setupEngine(
        {
          1: {
            battleArea: [{ card: "BT14-075", as: "devimon" }],
            hand: [{ card: optionId, as: "option" }],
            deck: filler,
          },
        },
        { autoSelectCards: true },
      );
      unlocked.state.turnSeat = 1;
      unlocked.state.memory = 10;
      await unlocked.ready();
      expect(
        unlocked.engine.applyIntent(1, { type: "playCard", instanceId: unlocked.inst("option").instanceId }),
      ).toEqual({ ok: true });
      await settle(() => unlocked.state.players[1]!.deck.length === filler.length - 3);

      const preferred: string[] = [];
      const s = setupEngine(
        valdurBoard({
          battleArea: [
            { card: "BT14-075", as: "devimon" },
            { card: "BT1-085", as: "tamer" },
          ],
          hand: [{ card: optionId, as: "option" }],
        }),
        { autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferPermanent(preferred, s, "tamer");
      await digivolveIntoValdurArm(s, 1);
      const opponentTurn = await startOpponentMainPhase(s);
      expect(observe(s.engine).timingEffectDisabled(s.perm("devimon"), "onPlay")).toBe(true);
      const deckBeforeOption = s.state.players[1]!.deck.length;
      const optionInstanceId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === optionInstanceId));
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[1]!.deck).toHaveLength(deckBeforeOption - 3);
      await opponentTurn.finish();
    } finally {
      registerIrCard(optionId, printedOption);
    }
  });

  it("stops a locked [On Play] from paying its own 'by trashing' cost (Q4353)", async () => {
    const fugamonBoard: SeatSpec = {
      battleArea: [{ card: "BT1-085", as: "tamer" }],
      hand: [
        { card: "BT24-013", as: "fugamon" },
        { card: "BT1-010", as: "fodder" },
      ],
    };
    const victim: PermanentSpec = { card: "BT20-010", as: "victim" };
    const playFugamon = async (s: EngineSetup) => {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("fugamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-013"));
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
    };
    const fodderInHand = (s: EngineSetup) =>
      s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("fodder").instanceId);
    const victimInPlay = (s: EngineSetup) =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-010");

    const locked = setupEngine(valdurBoard(fugamonBoard, 1, [victim]), {
      autoSelectCards: true,
      autoAcceptOptional: true,
    });
    await digivolveIntoValdurArm(locked, 1);
    const opponentTurn = await startOpponentMainPhase(locked);
    await playFugamon(locked);
    expect(fodderInHand(locked)).toBe(true);
    expect(victimInPlay(locked)).toBe(true);
    await opponentTurn.finish();

    const unlocked = setupEngine(
      { 0: { battleArea: [victim] }, 1: { ...fugamonBoard, deck: filler } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    unlocked.state.turnSeat = 1;
    unlocked.state.memory = 10;
    await unlocked.ready();
    await playFugamon(unlocked);
    expect(fodderInHand(unlocked)).toBe(false);
    expect(victimInPlay(unlocked)).toBe(false);
  });

  it("does not spend a shared [Once Per Turn] when the locked [On Play] cannot activate (Q4354)", async () => {
    const preferred: string[] = [];
    const tuwarmonBoard: SeatSpec = {
      battleArea: [
        { card: "BT1-085", as: "tamer" },
        { card: "EX10-045", under: ["BT1-010", "BT1-010"], as: "bagraHost" },
      ],
      hand: [{ card: "EX10-045", as: "tuwarmon" }],
    };
    const playAndAttackWithTuwarmon = async (s: EngineSetup): Promise<{ afterPlay: number; afterAttack: number }> => {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tuwarmon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tuwarmon").instanceId),
      );
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
      const afterPlay = s.perm("bagraHost").stack.length;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("tuwarmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => observe(s.engine).blockingSeat() === 0);
      const afterWhenAttacking = s.perm("bagraHost").stack.length;
      // Tuwarmon's ＜Collision＞ forces the level-6 Digimon to block; the attack ends in that battle.
      expect(
        s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("valdurBase").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return { afterPlay, afterAttack: afterWhenAttacking };
    };

    const locked = setupEngine(valdurBoard(tuwarmonBoard), {
      autoSelectCards: true,
      autoAcceptOptional: true,
      preferInstanceIds: preferred,
    });
    preferPermanent(preferred, locked, "tamer");
    await digivolveIntoValdurArm(locked, 1);
    expect(locked.perm("tamer").isSuspended).toBe(true);
    const opponentTurn = await startOpponentMainPhase(locked);
    expect(await playAndAttackWithTuwarmon(locked)).toEqual({ afterPlay: 2, afterAttack: 1 });
    await opponentTurn.finish();

    const unlocked = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-035", as: "valdurBase" }], security: ["BT1-010"], deck: filler },
        1: { ...tuwarmonBoard, deck: filler },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    unlocked.state.turnSeat = 1;
    unlocked.state.memory = 10;
    await unlocked.ready();
    expect(await playAndAttackWithTuwarmon(unlocked)).toEqual({ afterPlay: 1, afterAttack: 1 });
  });

  it("triggers Partition when Singularity of Chaos's inherited effect drops Valdur Arm to 0 DP (Q4605)", async () => {
    const endOpponentTurn = async (sources: string[]) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT20-037", under: sources, as: "valdur" }], deck: filler, security: ["BT1-010"] },
          1: { deck: filler, security: ["BT1-010", "BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const opponentTurn = await startOpponentMainPhase(s);
      await opponentTurn.finish();
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
      return s;
    };

    const withSingularity = await endOpponentTurn(["BT20-099", "BT20-035", "BT20-036"]);
    expect(withSingularity.state.players[1]!.security).toHaveLength(1);
    expect(withSingularity.state.players[0]!.battleArea.map((p) => p.topCard.cardId).sort()).toEqual([
      "BT20-035",
      "BT20-036",
    ]);
    expect(withSingularity.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-037", "BT20-099"]),
    );

    const withoutSingularity = await endOpponentTurn(["BT20-035", "BT20-036"]);
    expect(withoutSingularity.state.players[1]!.security).toHaveLength(2);
    expect(withoutSingularity.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-037"]);
  });

  it("stops both opposing Digimon and Tamers from activating [On Play] and from unsuspending (Q4718)", async () => {
    const opponent: SeatSpec = {
      battleArea: [
        { card: "BT20-010", as: "digimon" },
        { card: "BT1-085", as: "tamer" },
      ],
      hand: [
        { card: "BT4-093", as: "thomas" },
        { card: "BT14-075", as: "devimon" },
      ],
    };
    const playFromHand = async (s: EngineSetup, alias: string, cardId: string) => {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === cardId));
      await settle(() => s.state.pendingDecision === undefined);
      await drainMicrotasks();
    };
    const playThomasAndCountDraws = async (s: EngineSetup): Promise<number> => {
      const handBeforePlay = s.state.players[1]!.hand.length;
      await playFromHand(s, "thomas", "BT4-093");
      return s.state.players[1]!.hand.length - (handBeforePlay - 1);
    };
    const playDevimonAndCountTrashed = async (s: EngineSetup): Promise<number> => {
      const trashBeforePlay = s.state.players[1]!.trash.length;
      await playFromHand(s, "devimon", "BT14-075");
      return s.state.players[1]!.trash.length - trashBeforePlay;
    };

    const locked = setupEngine(valdurBoard(opponent, 2), { autoSelectCards: true });
    await digivolveIntoValdurArm(locked, 2);
    expect(locked.perm("digimon").isSuspended).toBe(true);
    expect(locked.perm("tamer").isSuspended).toBe(true);
    const lockedTurn = await startOpponentMainPhase(locked);
    expect(locked.perm("digimon").isSuspended).toBe(true);
    expect(locked.perm("tamer").isSuspended).toBe(true);
    expect(await playThomasAndCountDraws(locked)).toBe(0);
    expect(await playDevimonAndCountTrashed(locked)).toBe(0);
    await lockedTurn.finish();

    const unlocked = setupEngine(
      {
        0: { deck: filler },
        1: {
          ...opponent,
          battleArea: [
            { card: "BT20-010", as: "digimon", suspended: true },
            { card: "BT1-085", as: "tamer", suspended: true },
          ],
          deck: filler,
        },
      },
      { autoSelectCards: true },
    );
    await unlocked.ready();
    const unlockedTurn = await startOpponentMainPhase(unlocked);
    expect(unlocked.perm("digimon").isSuspended).toBe(false);
    expect(unlocked.perm("tamer").isSuspended).toBe(false);
    expect(await playThomasAndCountDraws(unlocked)).toBe(1);
    expect(await playDevimonAndCountTrashed(unlocked)).toBe(3);
    await unlockedTurn.finish();
  });

  it("lets Machinedramon place a card on attack but not activate the placed card's [On Play] (Q4841)", async () => {
    const preferred: string[] = [];
    const machinedramonBoard: SeatSpec = {
      battleArea: [
        { card: "BT1-085", as: "tamer" },
        { card: "EX9-073", as: "machinedramon" },
      ],
      trash: [{ card: "EX9-041", as: "placed", faceUp: true }],
    };
    const victim: PermanentSpec = { card: "BT20-010", as: "victim" };
    const attackWithMachinedramon = async (s: EngineSetup) => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("machinedramon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      await drainMicrotasks();
    };
    const placedUnderMachinedramon = (s: EngineSetup) =>
      s.perm("machinedramon").stack.some((card) => card.instanceId === s.inst("placed").instanceId);

    const locked = setupEngine(valdurBoard(machinedramonBoard, 1, [victim]), {
      autoSelectCards: true,
      autoAcceptOptional: true,
      preferInstanceIds: preferred,
    });
    preferPermanent(preferred, locked, "tamer");
    await digivolveIntoValdurArm(locked, 1);
    expect(locked.perm("machinedramon").isSuspended).toBe(false);
    const opponentTurn = await startOpponentMainPhase(locked);
    preferred.length = 0;
    preferPermanent(preferred, locked, "victim");
    await attackWithMachinedramon(locked);
    expect(placedUnderMachinedramon(locked)).toBe(true);
    expect(locked.perm("victim").isSuspended).toBe(false);
    expect(locked.perm("valdurBase").isSuspended).toBe(false);
    await opponentTurn.finish();

    const unlocked = setupEngine(
      { 0: { battleArea: [victim], security: ["BT1-010"], deck: filler }, 1: { ...machinedramonBoard, deck: filler } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    unlocked.state.turnSeat = 1;
    await unlocked.ready();
    await attackWithMachinedramon(unlocked);
    expect(placedUnderMachinedramon(unlocked)).toBe(true);
    expect(unlocked.perm("victim").isSuspended).toBe(true);
  });
});

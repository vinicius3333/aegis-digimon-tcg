import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-037.js";
import "./index.js";
import "../ST1/ST1-15.js";
import "./BT20-041.js";
import "../BT16/BT16-036.js";
import "../ST5/ST5-15.js";

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
        s.state.memory === 8 &&
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
            { card: "BT20-085", as: "opponentTamer" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
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

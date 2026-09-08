import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_098 } from "./BT24-098.js";
import "../index.js";

describe("BT24-098 Invasion of the Titans", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-098")).toMatchObject({
      cardId: "BT24-098",
      nameEn: "Invasion of the Titans",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      forms: ["-"],
      attributes: ["-"],
      types: ["Titan", "TS"],
    });
  });

  it("draws and trashes on Main, then arms and consumes Delay correctly", () => {
    const main = BT24_098.effects?.find((entry) => entry.trigger === "Main" && entry.keywords === undefined);
    expect(main?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    const arm = BT24_098.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(arm?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
    });
    const armAction = arm?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(arm).toMatchObject({ keywords: [{ keyword: "Delay", raw: "＜Delay＞" }] });
    expect(armAction?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      condition: { kind: "memoryAtLeast", value: 5, controller: "opponent" },
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 5 },
          nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
        },
        count: 1,
      },
    });
    expect(BT24_098.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
            },
            count: 1,
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("draws two, trashes exactly two hand cards, and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-042", as: "purpleTitan" }],
          hand: [
            { card: "BT24-098", as: "option" },
            { card: "BT1-009", as: "discard1" },
            { card: "BT1-009", as: "discard2" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-098"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("plays only a level-4-or-lower Titan from hand/trash, then adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-098", as: "securityOption", faceUp: true }],
          hand: [{ card: "BT24-042", as: "eligibleTitan" }],
          trash: ["BT24-075"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-042")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-075")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT24-098")).toBe(true);
  });

  it("publicly reveals Security, plays an exact level-4 Titan for free, then adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-098", as: "securityOption" }],
          hand: [{ card: "BT24-042", as: "eligibleTitan" }],
          trash: [{ card: "BT24-075", as: "ineligibleLevel5" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          security: ["BT1-013"],
          hand: ["BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === s.inst("eligibleTitan").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard.instanceId)).toContain(
      s.inst("eligibleTitan").instanceId,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ineligibleLevel5").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("arms on a public Titan play and uses Delay to play a level 5 Titan while the opponent has 5 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-098", as: "option" }],
          hand: [{ card: "BT24-042", as: "playedTitan" }],
          trash: [{ card: "BT24-075", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = -5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedTitan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("target").instanceId,
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("playedTitan").instanceId,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(-8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves Delay during a natural owner play after the opponent reaches the memory gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-042", as: "source" }],
          hand: [
            { card: "BT24-098", as: "option" },
            { card: "BT1-009", as: "filler1" },
            { card: "BT1-009", as: "filler2" },
            { card: "BT24-015", as: "playedTitan" },
          ],
          trash: [{ card: "BT24-015", as: "targetTitan" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT10-062", as: "opponentSource" }],
          hand: [{ card: "BT10-062", as: "opponentPlay" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-098"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentPlay").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedTitan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("targetTitan").instanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-098")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("targetTitan").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("publicly declines the natural triggered Delay and retains its source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-042", as: "source" }],
          hand: [
            { card: "BT24-098", as: "option" },
            { card: "BT1-009", as: "filler1" },
            { card: "BT1-009", as: "filler2" },
            { card: "BT24-015", as: "playedTitan" },
          ],
          trash: [{ card: "BT24-015", as: "targetTitan" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT10-062", as: "opponentSource" }],
          hand: [{ card: "BT10-062", as: "opponentPlay" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: false, autoDeclineOptional: false, autoSelectCards: true, autoChooseOption: true },
    );
    const optionId = s.inst("option").instanceId;
    const targetId = s.inst("targetTitan").instanceId;
    const titanId = s.inst("playedTitan").instanceId;
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-098"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentPlay").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: titanId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.decisions.some(
          ({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-098" && req.promptText.includes("Delay"),
        ),
    );
    const prompt = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-098" && req.promptText.includes("Delay"),
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(titanId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(targetId);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may pay Delay but plays nothing if the opponent no longer has 5 memory at resolution (Q5710)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-098", as: "option" },
            { card: "BT24-042", as: "playedTitan" },
          ],
          trash: [{ card: "BT24-075", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -1;
    await s.ready();
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("playedTitan").permanentId,
    });
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("option").instanceId, s.inst("target").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-075")).toBe(false);
  });
});

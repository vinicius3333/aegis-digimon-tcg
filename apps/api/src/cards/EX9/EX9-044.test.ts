import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-044.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-044", () => {
  it("shares its DNA limit across evolution and play while the same Hydramon and a second legal pair remain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "green1" },
            { card: "BT1-044", as: "blue1" },
            { card: "BT1-080", as: "green2" },
            { card: "BT1-044", as: "blue2" },
            { card: "EX9-044", as: "watcher" },
            { card: "BT21-033", as: "base" },
          ],
          hand: ["EX9-045", "EX9-045", { card: "EX9-040", as: "evo" }],
          trash: [{ card: "BT21-033", as: "later" }],
          deck: ["BT1-009", "BT1-010", "BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    const watcherId = s.perm("watcher").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX9-045")).toHaveLength(1);
    expect(s.perm("watcher").topCard.instanceId).toBe(watcherId);
    expect(s.perm("green2").topCard.cardId).toBe("BT1-080");
    expect(s.perm("blue2").topCard.cardId).toBe("BT1-044");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-045", "BT1-009", "BT1-010"]);
    const choicesBefore = s.decisions.filter(({ req }) => req.kind === "optional").length;
    // Effect-play a WG card from trash after the first DNA has completely resolved.
    await advance(s.engine).verb.playInstances([s.inst("later").instanceId]);
    await settle();
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX9-045")).toHaveLength(1);
    expect(s.perm("watcher").topCard.instanceId).toBe(watcherId);
    expect(s.perm("green2").topCard.cardId).toBe("BT1-080");
    expect(s.perm("blue2").topCard.cardId).toBe("BT1-044");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-045", "BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(choicesBefore);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { card: "BT1-046", turn: 0 as const },
    { card: "BT21-033", turn: 1 as const },
  ])("does not DNA after effect-playing $card on seat $turn's turn", async ({ card, turn }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-044", as: "watcher" },
            { card: "BT1-044", as: "partner" },
          ],
          hand: ["EX9-045", { card, as: "played" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = turn;
    s.state.memory = 3;
    await s.ready();
    // Effect play is permitted on either turn; a normal play intent cannot open the off-turn case.
    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-044", "BT1-044", card]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-045"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declines DNA after its real play without consuming either material or the hand candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-044", as: "partner" }],
          hand: [{ card: "EX9-044", as: "hydra" }, "EX9-045"],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hydra").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-044", "EX9-044"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-045"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(-6);
    // The play-time reduction offer and the later DNA offer were both declined.
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["play", "digivolve"] as const)(
    "responds to its own %s with real zero-cost DNA (Q4799/Q4800)",
    async (mode) => {
      const s = setupEngine(
        {
          0: {
            battleArea:
              mode === "play"
                ? [{ card: "BT1-044", as: "partner" }]
                : [
                    { card: "BT1-044", as: "partner" },
                    { card: "EX9-042", as: "base" },
                  ],
            hand: [{ card: "EX9-044", as: "hydra" }, "EX9-045"],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      await s.ready();
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hydra").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("hydra").instanceId,
              useAlternateCost: true,
            });
      expect(result).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-045"]);
      const merged = s.state.players[0]!.battleArea[0]!;
      expect(merged.isSuspended).toBe(false);
      expect(merged.stack.map(({ cardId }) => cardId).sort()).toEqual(
        mode === "play" ? ["BT1-044", "EX9-044"] : ["BT1-044", "EX9-042", "EX9-044"],
      );
      expect(s.state.memory).toBe(mode === "play" ? -6 : 2);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
        mode === "play" ? ["BT1-009"] : ["BT1-009", "BT1-009"],
      );
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("reduces play cost by suspending an own WG Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [{ actions: [{ mode: "reduceCost", amount: 4, cost: { kind: "suspend" } }] }],
    }));
  it("suspends and restricts an opposing Digimon or Tamer on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { kind: ["Digimon", "Tamer"] } } },
          { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
        ],
      });
  });
  it("has once-per-turn WG DNA digivolution responses", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "DnaDigivolve" }] },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "DnaDigivolve" }] },
      ],
    }));

  it("suspends and restricts an opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-044", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("suspends and restricts an opposing Digimon or Tamer on digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-044", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT3-093", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("reduces the play cost by 4 after suspending an own WG Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-044", as: "hydra" }], battleArea: [{ card: "EX9-040", as: "wg" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hydra").instanceId }).ok).toBe(true);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-044"));
    expect(before - s.state.memory).toBe(7);
    expect(s.perm("wg").isSuspended).toBe(true);
  });

  it.each(["whenPlayed", "whenOneOfYoursDigivolves"] as const)(
    "fires the %s WG DNA response through the public event seam",
    async (event) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-044", as: "source" },
              { card: "EX9-044", as: "played" },
            ],
            hand: [
              { card: "EX9-045", as: "dna" },
              { card: "EX9-040", as: "other" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      await advance(s.engine).fireSubTrigger(event, { subjectPermanentId: s.perm("played").permanentId });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-045"));
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-045")).toBe(true);
    },
  );

  it("allows independent Digimon and Tamer targets on a real play (Q4798)", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX9-044", as: "source" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "digimon" },
          { card: "BT3-093", as: "tamer" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.length >= 1);
    expect(s.state.pendingDecision?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const first = s.state.pendingDecision!;
    expect(first.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("digimon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" && s.state.pendingDecision.decisionId !== first.decisionId,
    );
    const second = s.state.pendingDecision!;
    expect(second.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("tamer").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(-6);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    // Its own play also opens the optional DNA response after On Play resolves.
    expect(s.state.pendingDecision?.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    expect(s.perm("tamer").isSuspended).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { card: "EX9-040", suspended: false, decline: true },
    { card: "EX9-040", suspended: true, decline: false },
    { card: "BT1-009", suspended: false, decline: false },
  ])(
    "pays the printed cost when no WG suspension is paid: $card / $suspended / $decline",
    async ({ card, suspended, decline }) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX9-044", as: "hydra" }], battleArea: [{ card, as: "candidate", suspended }] },
        },
        { autoDeclineOptional: decline, autoAcceptOptional: !decline, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hydra").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.state.memory).toBe(-6);
      expect(s.perm("candidate").isSuspended).toBe(suspended);
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX9-044")).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});

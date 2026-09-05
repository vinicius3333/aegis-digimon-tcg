import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-044.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-044", () => {
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

  it("allows the suspend and restriction clauses to choose independent targets", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-044", as: "source" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "digimon" },
          { card: "BT3-093", as: "tamer" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.decisions.length >= 1);
    const first = s.decisions[0]!.req;
    expect(first.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("digimon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.length >= 2);
    const second = s.decisions[1]!.req;
    expect(second.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("tamer").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolution;
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

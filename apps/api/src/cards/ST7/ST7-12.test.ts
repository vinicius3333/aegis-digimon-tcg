import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-066.js";
import "./ST7-12.js";

describe("ST7-12 Atomic Blaster", () => {
  it("deletes opposing Digimon whose selected total DP is at most 8000", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
        1: {
          battleArea: [
            { card: "ST7-02", as: "agumon" },
            { card: "ST7-06", as: "geogreymon" },
            { card: "ST7-07", as: "rizegreymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("agumon").permanentId, s.perm("geogreymon").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("rizegreymon").permanentId,
    ]);
    const decision = s.decisions.find(({ req }) => req.kind === "chooseTargets")?.req;
    expect(decision?.options?.min).toBe(1);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST7-12", as: "option", faceUp: true }] }, 1: { battleArea: ["ST7-02"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not reinterpret an over-8000 selection as a smaller subset", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
      1: {
        battleArea: [
          { card: "ST7-02", as: "small" },
          { card: "ST7-07", as: "large" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("small").permanentId, s.perm("large").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});

type AtomicBlasterHarness = ReturnType<typeof setupEngine>;

async function openBudgetChoice(s: AtomicBlasterHarness) {
  s.state.memory = 6;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  return s.decisions.at(-1)!.req;
}

function chooseTargets(s: AtomicBlasterHarness, decisionId: string, aliases: string[]) {
  return s.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId,
    response: { kind: "chooseTargets", instanceIds: aliases.map((alias) => s.perm(alias).permanentId) },
  });
}

function opponentPermanentIds(s: AtomicBlasterHarness) {
  return s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId).sort();
}

describe("ST7-12 Atomic Blaster — KB Q&A rulings", () => {
  it("deletes any number of chosen Digimon whose DP adds up to 8000 or less, such as 2000 + 2000 + 3000 (Q692)", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
      1: {
        battleArea: [
          { card: "ST7-02", as: "first2000" },
          { card: "ST7-02", as: "second2000" },
          { card: "ST7-04", as: "blocker3000" },
          { card: "ST7-06", as: "survivor5000" },
        ],
      },
    });
    const decision = await openBudgetChoice(s);
    expect(decision.options?.maxTotalDP).toBe(8000);
    expect(decision.options?.max).toBe(4);
    expect(chooseTargets(s, decision.decisionId, ["first2000", "second2000", "blocker3000"])).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(opponentPermanentIds(s)).toEqual([s.perm("survivor5000").permanentId]);
  });

  it("may choose fewer Digimon than the 8000 DP budget allows, but at least 1 (Q693)", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
      1: {
        battleArea: [
          { card: "ST7-02", as: "chosen" },
          { card: "ST7-02", as: "skipped" },
          { card: "ST7-04", as: "alsoSkipped" },
        ],
      },
    });
    const decision = await openBudgetChoice(s);
    expect(decision.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(chooseTargets(s, decision.decisionId, ["chosen"])).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);
    expect(opponentPermanentIds(s)).toEqual([s.perm("skipped").permanentId, s.perm("alsoSkipped").permanentId].sort());
  });

  it("cannot choose more Digimon after deleting [Golemon] lowers the remaining black Digimon's DP (Q694)", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST7-02"], hand: [{ card: "ST7-12", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT4-066", as: "golemon" },
          { card: "ST5-02", as: "jazamon" },
        ],
      },
    });
    const decision = await openBudgetChoice(s);
    expect(s.perm("golemon").currentDP).toBe(4000);
    expect(s.perm("jazamon").currentDP).toBe(5000);
    expect(chooseTargets(s, decision.decisionId, ["golemon"])).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("jazamon").currentDP).toBe(4000);
    expect(opponentPermanentIds(s)).toEqual([s.perm("jazamon").permanentId]);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });
});

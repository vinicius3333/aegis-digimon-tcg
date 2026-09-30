import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./P-166.js";
import "../BT3/BT3-103.js";
import "../EX3/EX3-016.js";

describe("P-166 Galemon", () => {
  it("encodes optional suspension, conditional Bird/Avian digivolution, and suspended-Digimon cost scaling", () => {
    const compiled = runtimeCompiledCard("P-166")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "Suspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Digivolve",
        optional: true,
        from: ["hand"],
        condition: { kind: "isYourTurn" },
        into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bird", "Avian"], match: "traitContains" }] },
      });
      expect(effect.actions[1]).toMatchObject({
        reduceCostScaling: {
          per: 1,
          unit: "cards",
          filter: { controller: "any", excludeSelf: true, suspended: true, kind: ["Digimon"] },
        },
      });
    }
  });

  it("encodes inherited Your Turn +2000 DP", () => {
    expect(runtimeCompiledCard("P-166")!.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          isInherited: true,
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
        }),
      ]),
    );
  });

  it("applies inherited +2000 DP to a real host only during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["P-166"] }] },
    });
    const baseDP = s.perm("host").baseDP;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(baseDP + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP + 2000);
  });

  it("suspends one Digimon on play when the optional first clause is accepted", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-166", as: "galemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard!.instanceId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("galemon"));
    await settle();
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("counts a card whose trait only contains [Bird] (e.g. [Giant Bird])", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-166", as: "galemon" },
            { card: "BT17-047", as: "parrotmon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("galemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("galemon").topCard.cardId === "BT17-047");

    expect(s.perm("galemon").topCard.cardId).toBe("BT17-047");
  });

  it.each([0, 1, 2])(
    "digivolves into an Avian and reduces its cost for %s other suspended Digimon",
    async (suspendedHelpers) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "P-166", as: "galemon" },
              { card: "BT5-053", as: "bird" },
            ],
            battleArea: Array.from({ length: suspendedHelpers }, (_, index) => ({
              card: "BT1-064",
              as: `helper-${index}`,
              suspended: true,
            })),
          },
          1: { battleArea: [{ card: "BT1-009", as: "target" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      const targetPermanentId = s.perm("target").permanentId;
      preferred.push(s.perm("target").topCard!.instanceId);
      await s.ready();
      s.state.memory = 10;
      const playResult = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("galemon").instanceId });
      expect(playResult).toEqual({ ok: true });
      await settle(() => s.perm("galemon").topCard.cardId === "BT5-053");
      const target = s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === targetPermanentId);
      expect(target).toBeDefined();
      expect(target!.isSuspended).toBe(true);
      expect(s.perm("galemon").topCard.cardId).toBe("BT5-053");
      expect(s.state.memory).toBe(4 + suspendedHelpers);
    },
  );
});

describe("P-166 Galemon — KB Q&A rulings", () => {
  async function answerTargetsInOrder(s: EngineSetup, script: string[], done: () => boolean): Promise<void> {
    const remaining = [...script];
    for (let step = 0; step < 20 && !done(); step += 1) {
      await settle(() => done() || ["chooseTargets", "selectCards"].includes(s.state.pendingDecision?.kind ?? ""));
      if (done()) return;
      const decision = s.state.pendingDecision!;
      const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
      const candidates = request.options?.candidateInstanceIds ?? [];
      const pick = remaining.find((id) => candidates.includes(id))!;
      expect(pick, `scripted answer among ${candidates.join(",")}`).toBeDefined();
      remaining.splice(remaining.indexOf(pick), 1);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: decision.kind as "chooseTargets", instanceIds: [pick] },
        }),
      ).toEqual({ ok: true });
    }
  }

  it("counts a Digimon suspended for BT3-103's cost, for a combined reduction of 7 (Q4276)", async () => {
    const increaser = (alias: string) => ({ card: "BT1-009", as: alias, under: ["EX3-016"] });
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT3-103", as: "hidden" },
            { card: "P-166", as: "galemon" },
            { card: "BT25-015", as: "garudamon" },
          ],
          battleArea: [{ card: "BT1-064", as: "helper" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [increaser("target"), increaser("a"), increaser("b"), increaser("c")] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hidden").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("galemon").instanceId })).toEqual({
      ok: true,
    });
    await answerTargetsInOrder(
      s,
      [
        s.perm("target").permanentId,
        s.perm("target").topCard.instanceId,
        s.perm("helper").permanentId,
        s.perm("helper").topCard.instanceId,
        s.inst("garudamon").instanceId,
      ],
      () => s.perm("galemon").topCard.instanceId === s.inst("garudamon").instanceId,
    );
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("helper").isSuspended).toBe(true);
    expect(s.perm("galemon").topCard.cardId).toBe("BT25-015");
    // 10 - 4 (play) - (4 printed + 4 EX3-016 increases - 5 BT3-103 - 2 other suspended Digimon)
    expect(s.state.memory).toBe(5);
  });
});

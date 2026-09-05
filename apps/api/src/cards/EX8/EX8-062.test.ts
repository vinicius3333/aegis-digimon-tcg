import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-062.js";

describe("EX8-062", () => {
  it("has Blast Digivolve and gives four opposing Digimon -2000 DP on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toHaveLength(4);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -2000,
      duration: "forTheTurn",
    });
  });
  it("has the all-turns deletion response that may play an NSo Digimon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      sourceFilter: { controllerDefault: "both", excludeSelf: true },
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    });
  });
  it("exposes the level-5 NSo evolution route for cost 3", () =>
    expect(digivolutionRequirementsFor("EX8-062")).toContainEqual({
      level: 5,
      traits: ["NSo"],
      cost: 3,
      isAlternate: true,
    }));
  it("applies the four sequential -2000 DP reductions to an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-062", as: "source" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(12000);
  });
  it("distributes the four activations and delays 0-DP deletion until all four finish (Q3948-Q3950)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-062", as: "source" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "zeroTarget", dp: 2000 },
          { card: "AD1-004", as: "otherTarget", dp: 10000 },
        ],
      },
    });
    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    let zeroTargetPresent = false;
    let zeroTargetDp = -1;
    for (const [index, target] of ["zeroTarget", "otherTarget", "otherTarget", "otherTarget"].entries()) {
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const decision = s.state.pendingDecision!;
      if (index === 1) {
        zeroTargetPresent = s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010");
        zeroTargetDp = s.perm("zeroTarget").currentDP;
      }
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm(target).permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
    }
    await resolution;
    expect(zeroTargetPresent).toBe(true);
    expect(zeroTargetDp).toBe(0);
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "BT1-010"));

    expect(s.perm("otherTarget").currentDP).toBe(4000);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
  });
  it("plays an eligible NSo Digimon from trash when another Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-062", as: "source" }], trash: ["BT26-062"] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-062"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-062")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-062")).toBe(false);
  });

  it("uses the other-Digimon deletion response only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-062", as: "source" }], trash: ["BT26-062", "EX8-057"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstVictim" },
            { card: "BT1-011", as: "secondVictim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.state.players[0]!.trash.find((card) => card.cardId === "BT26-062")!.instanceId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstVictim").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT26-062"));
    await advance(s.engine).verb.deletePermanent([s.perm("secondVictim").permanentId], "byEffect");

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX8-057");
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId !== "EX8-062")).toHaveLength(
      1,
    );
  });

  it("does not trigger its play response from Piedmon's own deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-062", as: "source" }], trash: ["BT26-062"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX8-062", "BT26-062"]),
    );
  });

  it("Blast Digivolves from hand over a legal NSo level 5 during Counter", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX8-060", as: "base" }],
        hand: [{ card: "EX8-062", as: "piedmon" }],
        security: ["BT1-010"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("piedmon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX8-062");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX8-060"]);
  });
});

import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-13", () => {
  it("reduces ADVENTURE Digimon hand play cost by suspending this Tamer", () => {
    const reduction = (runtimeCompiledCard("ST21-13")?.effects ?? [])[0];
    expect(reduction).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "Replacement", event: "wouldBePlayed" }],
    });
    expect(irNode(reduction!.actions[0]!).actions[0]).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 1,
    });
  });
  it("grants Rush to level 5+ ADVENTURE Digimon and has a security play effect", () => {
    const effects = runtimeCompiledCard("ST21-13")?.effects ?? [];
    expect(effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" } }],
    });
    expect(effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("plays itself without cost when revealed from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST21-13", as: "mattTk" }] },
        1: { battleArea: [{ card: "ST1-03", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("mattTk").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("mattTk").instanceId),
    ).toBe(true);
  });
});

describe("ST21-13 Matt Ishida & T.K. Takaishi — KB Q&A rulings", () => {
  async function playLillymonWithTamers(tamers: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: tamers.map((card, index) => ({ card, as: `tamer${index}` })),
          hand: [{ card: "ST21-09", as: "lillymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const lillymonId = s.inst("lillymon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: lillymonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === lillymonId),
    );
    return {
      memory: s.state.memory,
      suspended: tamers.map((_, index) => s.perm(`tamer${index}`).isSuspended),
      reductionPrompts: s.decisions.filter(({ req }) => req.promptText === "reduce the play cost by 1").length,
    };
  }

  it("reduces an ADVENTURE Digimon's play cost by 2 when both Tamers' effects activate (Q4483, Q4484)", async () => {
    expect(await playLillymonWithTamers(["ST21-12", "ST21-13"])).toEqual({
      memory: 5,
      suspended: [true, true],
      reductionPrompts: 2,
    });
    expect(await playLillymonWithTamers(["ST21-12"])).toEqual({
      memory: 4,
      suspended: [true],
      reductionPrompts: 1,
    });
  });

  it("stacks the reductions of two copies of this Tamer for a total of 2 (Q6098)", async () => {
    expect(await playLillymonWithTamers(["ST21-13", "ST21-13"])).toEqual({
      memory: 5,
      suspended: [true, true],
      reductionPrompts: 2,
    });
    expect(await playLillymonWithTamers(["ST21-13"])).toEqual({
      memory: 4,
      suspended: [true],
      reductionPrompts: 1,
    });
  });
});

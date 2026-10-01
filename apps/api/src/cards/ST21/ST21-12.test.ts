import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-12", () => {
  it("gains memory for an ADVENTURE Digimon and reduces hand play cost by suspending", () => {
    const effects = runtimeCompiledCard("ST21-12")?.effects ?? [];
    expect(effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    });
    const replacement = effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldBePlayed" });
    expect(irNode(replacement).actions[0]).toMatchObject({ kind: "Replacement", mode: "reduceCost", amount: 1 });
    expect(irNode(replacement).actions[0].cost.actions?.[0] ?? irNode(replacement).actions[0].cost).toBeDefined();
  });
  it("plays itself from security without cost", () => {
    expect(
      (runtimeCompiledCard("ST21-12")?.effects ?? []).find((effect) => effect.trigger === "Security"),
    ).toMatchObject({ isSecurity: true });
  });

  it("plays itself without cost when revealed from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST21-12", as: "joeMimi" }] },
        1: { battleArea: [{ card: "ST1-03", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoOrderTriggers: true, autoAcceptOptional: true },
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
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("joeMimi").instanceId,
      ),
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("joeMimi").instanceId,
      ),
    ).toBe(true);
  });
});

describe("ST21-12 Joe Kido & Mimi Tachikawa — KB Q&A rulings", () => {
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
});

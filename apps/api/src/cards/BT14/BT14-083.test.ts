import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-083.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-083", () => {
  it("registers on-play trashing, opponent-host response, and security play", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, choose: true });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDigivolutionTrashed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
    });
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("naturally gains memory when another Joe trashes an opponent Digimon's source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-083", as: "watcher" }],
          hand: [{ card: "BT14-083", as: "joe" }],
        },
        1: {
          battleArea: [{ card: "BT14-058", as: "host", under: ["BT14-057"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("joe").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("watcher").isSuspended && s.perm("host").stack.length === 0);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("watcher").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9);
  });

  it("lets its controller choose a source other than the top card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-083", as: "joe" }] },
        1: { battleArea: [{ card: "BT14-058", as: "host", under: ["BT14-057", "BT14-057"] }] },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();
    const ids = s.perm("host").stack.map((card) => card.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("joe").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    if (s.state.pendingDecision?.kind === "chooseTargets") {
      const target = s.decisions.at(-1)!.req;
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: target.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("host").permanentId] },
      });
    }
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.decisions.at(-1)!.req;
    expect(choice.sourceCardId).toBe("BT14-083");
    expect(choice.options?.candidateInstanceIds).toEqual(ids);
    expect(choice.options).toMatchObject({ min: 1, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [ids[0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.length === 1);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([ids[1]]);
  });

  it("plays itself from security through a natural security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-071", as: "attacker" }] },
        1: { security: [{ card: "BT14-083", as: "securityJoe" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-083"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-083")).toBe(true);
  });

  it("can pay the printed suspension cost again when unsuspended in the same turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-083", as: "joe" },
            { card: "BT1-028", as: "blueSource" },
          ],
          hand: [{ card: "BT1-099", as: "firstOption" }, { card: "BT1-099", as: "secondOption" }, "BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-037", as: "firstTarget", under: ["BT1-028"] },
            { card: "BT1-037", as: "secondTarget", under: ["BT1-028"] },
          ],
          hand: ["BT1-009"],
          deck: Array(8).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(s.perm("firstTarget").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("joe").isSuspended && s.perm("firstTarget").stack.length === 0);
    expect(s.state.memory).toBe(8);
    await advance(s.engine).verb.unsuspend([s.perm("joe").permanentId]);
    preferred.splice(0, preferred.length, s.perm("secondTarget").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("secondTarget").stack.length === 0);
    expect(s.perm("joe").isSuspended).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.filter((c) => c.cardId === "BT1-099")).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});

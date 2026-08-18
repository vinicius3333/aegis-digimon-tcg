import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-066.js";

describe("EX1-066 Analog Youth", () => {
  it("reveals 3, adds a Digimon, and trashes the other revealed cards on play", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX1-066", as: "analog" }],
        battleArea: [{ card: "EX1-056", as: "source" }],
        deck: [
          { card: "BT1-009", as: "digimon" },
          { card: "BT1-001", as: "egg" },
          { card: "EX1-067", as: "option" },
        ],
      },
    }, { autoOrderTriggers: true, autoSelectCards: false });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("analog").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const search = s.decisions.at(-1)!.req;
    expect(search.sourceCardId).toBe("EX1-066");
    expect(search.options?.candidateInstanceIds).toEqual([s.inst("digimon").instanceId]);
    expect(search.options?.visibleInstanceIds).toEqual(expect.arrayContaining([
      s.inst("digimon").instanceId,
      s.inst("egg").instanceId,
      s.inst("option").instanceId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: search.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("digimon").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("digimon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("egg").instanceId,
      s.inst("option").instanceId,
    ]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("may suspend after a level-5 Digimon with sources is deleted to gain memory and hatch", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-066", as: "analog" }, { card: "EX1-061", as: "victim", under: ["EX1-056"] }], eggDeck: ["BT1-001"] } }, { autoAcceptOptional: true });
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    expect(s.perm("analog").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding).toBeDefined();
  });

  it("does nothing after declining to suspend the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-066", as: "analog" },
            { card: "EX1-061", as: "victim", under: ["EX1-056"] },
          ],
          eggDeck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("analog").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.eggDeck).toHaveLength(1);
  });

  it("does not gain memory or hatch when Analog Youth is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-066", as: "analog", suspended: true },
            { card: "EX1-061", as: "victim", under: ["EX1-056"] },
          ],
          eggDeck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.eggDeck).toHaveLength(1);
  });

  it("with two copies, only each unsuspended Analog Youth can pay once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-066", as: "spentAnalog", suspended: true },
            { card: "EX1-066", as: "readyAnalog" },
            { card: "EX1-061", as: "victim", under: ["EX1-056"] },
          ],
          eggDeck: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("spentAnalog").isSuspended).toBe(true);
    expect(s.perm("readyAnalog").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.eggDeck).toHaveLength(1);
  });

  it("still gains memory after paying the suspend cost when breeding is occupied", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-066", as: "analog" },
            { card: "EX1-061", as: "victim", under: ["EX1-056"] },
          ],
          breeding: { card: "BT1-009", as: "raised" },
          eggDeck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");

    expect(s.perm("analog").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.eggDeck).toHaveLength(1);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 1: { security: [{ card: "EX1-066", as: "analog", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("analog"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX1-066")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});

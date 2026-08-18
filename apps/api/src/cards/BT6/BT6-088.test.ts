import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-088.js";

describe("BT6-088 Matt Ishida", () => {
  it("gains 1 memory and draws 1 when Gabumon moves from breeding", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT6-088", as: "matt" }],
      breeding: { card: "BT6-019", as: "gabumon" },
      deck: [{ card: "BT1-001", as: "drawn" }],
    } });
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("gabumon").permanentId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-088", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-088")).toBe(true);
  });

  it("digivolves Gabumon into Bond of Friendship and trashes 2 security", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-019", as: "gabumon" }, { card: "BT6-088", as: "matt" }], hand: [{ card: "BT6-030", as: "bond" }], security: ["BT1-001", "BT1-002", "BT1-003"] } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("gabumon").topCard!.instanceId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("matt").topCard!.instanceId, effectKey: "BT6-088/main-digivolve-bond-of-friendship" })).toEqual({ ok: true });
    await settle(() =>
      s.perm("gabumon").topCard?.cardId === "BT6-030" &&
      s.state.players[0]!.security.length === 1 &&
      observe(s.engine).subscriptions("endOfTurn").length > 0,
    );

    expect(s.perm("gabumon").topCard?.cardId).toBe("BT6-030");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(2);

    const bondInstanceId = s.perm("gabumon").topCard.instanceId;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondInstanceId)).toBe(true);
  });

  it("keeps the blue requirement while ignoring level", async () => {
    const s = setupEngine({ 0: {
      battleArea: [
        { card: "BT2-069", as: "purpleGabumon" },
        { card: "BT6-088", as: "matt" },
      ],
      hand: [{ card: "BT6-030", as: "bond" }],
      security: ["BT1-001", "BT1-002"],
    } });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("matt").topCard.instanceId,
      effectKey: "BT6-088/main-digivolve-bond-of-friendship",
    })).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("excludes Gabumon X, exposes duplicate Bonds, and keeps the delayed deletion after Matt leaves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-019", as: "gabumon" },
          { card: "BT9-020", as: "gabumonX" },
          { card: "BT6-088", as: "matt" },
        ],
        hand: [
          { card: "BT6-030", as: "firstBond" },
          { card: "BT6-030", as: "secondBond" },
        ],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    const firstBondId = s.inst("firstBond").instanceId;
    const secondBondId = s.inst("secondBond").instanceId;
    const gabumonPermanentId = s.perm("gabumon").permanentId;
    const mattPermanentId = s.perm("matt").permanentId;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("matt").topCard.instanceId,
      effectKey: "BT6-088/main-digivolve-bond-of-friendship",
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const hostDecision = s.decisions.at(-1)!.req;
    expect(hostDecision.options?.candidateInstanceIds).toEqual([gabumonPermanentId]);
    expect(hostDecision.options?.candidateInstanceIds).not.toContain(
      s.perm("gabumonX").permanentId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: hostDecision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [gabumonPermanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const bondDecision = s.decisions.at(-1)!.req;
    expect(new Set(bondDecision.options?.candidateInstanceIds)).toEqual(new Set([
      firstBondId,
      secondBondId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: bondDecision.decisionId,
      response: { kind: "selectCards", instanceIds: [secondBondId] },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("gabumon").topCard.instanceId === secondBondId &&
      observe(s.engine).subscriptions("endOfTurn").length === 1
    );

    expect(await advance(s.engine).verb.deletePermanent([mattPermanentId], "byEffect")).toBe(1);
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondBondId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === firstBondId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) =>
      permanentId === gabumonPermanentId
    )).toBe(false);
  });
});

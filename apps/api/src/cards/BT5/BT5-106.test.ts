import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../BT13/BT13-080.js";
import "./BT5-106.js";

describe("BT5-106 Demonic Disaster", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-106")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("may delete one Digimon to unsuspend a purple Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-071", as: "cost" },
            { card: "BT5-072", as: "target", suspended: true },
            { card: "BT5-068", as: "wrongColor", suspended: true },
          ],
          hand: [{ card: "BT5-106", as: "option" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    const costPermanentId = s.perm("cost").permanentId;
    preferInstanceIds.push(s.perm("cost").permanentId);
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.perm("target").isSuspended &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costPermanentId),
    );
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.perm("wrongColor").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costPermanentId)).toBe(false);
  });

  it("may decline the delete-and-unsuspend Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-071", as: "cost" },
            { card: "BT5-072", as: "target", suspended: true },
          ],
          hand: [{ card: "BT5-106", as: "option" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.perm("cost")).toBeDefined();
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("security plays a level 3 purple Digimon from trash with On Play suppressed", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT5-106", as: "securityOption", faceUp: true }],
          trash: [
            { card: "BT13-080", as: "played" },
            { card: "BT5-060", as: "wrongColor" },
            { card: "BT5-084", as: "wrongLevel" },
          ],
          deck: ["BT5-071"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongColor").instanceId, s.inst("wrongLevel").instanceId]),
    );
  });

  it("may decline the optional Security play", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT5-106", as: "securityOption", faceUp: true }],
          trash: [{ card: "BT13-080", as: "candidate" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });
});

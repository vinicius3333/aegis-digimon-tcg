import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-095.js";

describe("BT5-095 Transcendent Sword", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-095")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("encodes exact source exclusions and one-target DP branches", () => {
    const main = runtimeCompiledCard("BT5-095")!.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions).toHaveLength(2);
    expect(main.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } } },
    });
    expect(main.actions[1]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 15000 } } },
    });
    for (const action of main.actions) {
      expect(action.condition).toMatchObject({
        filter: {
          excludeNameOrTrait: [
            { tokens: ["DoruGreymon"], match: "nameExact" },
            { tokens: ["BurningGreymon"], match: "nameExact" },
            { tokens: ["DexDoruGreymon"], match: "nameExact" },
          ],
        },
      });
    }
  });

  it("uses the normal 11000-DP ceiling without Omnimon or qualifying Greymon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-007"], hand: [{ card: "BT5-095", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT5-046", as: "atCap", dp: 11000 },
            { card: "BT5-046", as: "aboveCap", dp: 11001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("atCap").instanceId),
    );
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(s.inst("aboveCap").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("resolves without deletion when no opponent Digimon meets the selected ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-007"], hand: [{ card: "BT5-095", as: "option" }] },
        1: { battleArea: [{ card: "BT5-046", as: "aboveCap", dp: 11001 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[1]!.battleArea[0]?.topCard?.instanceId).toBe(s.inst("aboveCap").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("uses 15000 DP instead, as one deletion, when Omnimon is in play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-086", "BT1-085"], hand: [{ card: "BT5-095", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT5-046", as: "high", dp: 15000 },
            { card: "BT5-046", as: "above", dp: 15001 },
            { card: "BT5-021", as: "low", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("high").topCard.instanceId);
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(s.inst("above").instanceId);
  });

  it("does not upgrade the ceiling for an opponent Omnimon or an excluded Greymon name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT5-007", "BT13-072"],
          hand: [{ card: "BT5-095", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT5-086", as: "opponentOmnimon" },
            { card: "BT5-046", as: "target", dp: 12000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("target").instanceId)).toBe(
      true,
    );
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT5-095", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT5-046", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

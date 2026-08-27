import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-105.js";

describe("BT5-105 Ultimate Flare", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-105")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("De-Digivolves and then deletes every opposing play-cost-3-or-less Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-059"], hand: [{ card: "BT5-105", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT5-084", as: "stacked", under: ["BT5-059"] },
            { card: "BT5-060", as: "costThree" },
            { card: "BT5-061", as: "costFour" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("costFour").permanentId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT5-059");
  });

  it("still deletes low-cost Digimon when no De-Digivolve target exists", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-059"], hand: [{ card: "BT5-105", as: "option" }] },
        1: { battleArea: [{ card: "BT5-060", as: "costThree" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("stops De-Digivolve at level 3 before the low-cost deletion sweep", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-059"], hand: [{ card: "BT5-105", as: "option" }] },
        1: {
          battleArea: [
            {
              card: "BT5-084",
              as: "target",
              under: [
                { card: "BT5-061", as: "level3" },
                { card: "BT5-064", as: "middle" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.instanceId === s.inst("level3").instanceId);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("target").instanceId, s.inst("middle").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("level3").instanceId);
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT5-105", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT5-060", as: "costThree" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

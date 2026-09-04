import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-067.js";
import "../index.js";

describe("EX7-067 Summon Frost", () => {
  it("trashes 2 digivolution cards from each opposing Digimon, then may play a level 4 or lower Ice-Snow Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", target: { count: "all" }, amount: 2 });
    expect(actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      condition: { kind: "ifThisEffectDidNotAct" },
    });
  });
  it("restricts attack for opposing Digimon with no digivolution cards and activates from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[2]).toMatchObject({
      kind: "Restrict",
      restriction: "attack",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" });
  });

  it("trashes the top two cards from every opposing stack and restricts the resulting stackless Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-067", as: "summon" }],
          battleArea: [
            { card: "EX7-048", as: "musketeer" },
            { card: "EX7-016", as: "blue" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "stacked",
              under: [
                { card: "BT1-010", as: "underOne" },
                { card: "BT1-010", as: "underTwo" },
              ],
            },
            { card: "BT1-009", as: "empty" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("summon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("stacked").stack.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("underOne").instanceId, s.inst("underTwo").instanceId]),
    );
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "attack")).toBe(true);
  });

  it("plays an Ice-Snow Digimon when no opposing stack card was trashed, then restricts stackless attackers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-067", as: "summon" },
            { card: "EX7-016", as: "ice" },
          ],
          battleArea: [
            { card: "EX7-048", as: "musketeer" },
            { card: "EX7-016", as: "blue" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "empty" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("summon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("ice").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("ice").instanceId),
    ).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
  });

  it("resolves the same Main body from Security and keeps the post-then restriction", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX7-067", as: "summon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "empty" }] },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("summon"));
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
  });
});

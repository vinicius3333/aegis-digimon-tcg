import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-070.js";
import "../index.js";

describe("EX7-070 Der Blitz", () => {
  it("De-Digivolves an opponent when this stack card is trashed", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardDiscarded",
      sourceFilter: { isSelfRef: true },
      requireByEffect: true,
      actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }],
    }));
  it("deletes the lowest-cost opponent and places itself under a Three Musketeers Digimon", () =>
    expect(compiled.effects?.find((e) => e.trigger === "Main")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { superlative: "lowestPlayCost" } } },
      { kind: "PlaceUnder", position: "bottom" },
    ]));
  it("deletes the lowest-cost opponent from security", () =>
    expect(compiled.effects?.find((e) => e.isSecurity)?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    }));

  it("deletes the lowest-cost opponent and places itself under a Three Musketeers Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-070", as: "blitz" }],
          battleArea: [{ card: "EX7-048", as: "musketeer" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheap" },
            { card: "EX7-046", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("cheap").instanceId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("cheap").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      s.inst("expensive").instanceId,
    );
    expect(s.perm("musketeer").stack.map((card) => card.instanceId)).toContain(s.inst("blitz").instanceId);
  });

  it("de-digivolves an opponent when an effect trashes this stack card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX7-070", as: "blitz" }] }] },
      1: { battleArea: [{ card: "EX7-046", as: "target", under: ["BT1-009"] }] },
    });
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("blitz").instanceId], 0);
    await settle(() => s.perm("target").topCard?.cardId === "BT1-009");
    expect(s.perm("target").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  });

  it("deletes the lowest-play-cost opponent when revealed as Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX7-070", as: "blitz" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "cheap" },
          { card: "EX7-046", as: "expensive" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("blitz"));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("cheap").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("expensive"), "attack")).toBe(false);
  });
});

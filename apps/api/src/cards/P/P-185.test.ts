import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-185.js";

describe("P-185 EmperorGreymon", () => {
  it("requires a Takuya Kanbara Tamer with five Hybrid cards under it", () => {
    expect(runtimeCompiledCard("P-185")!.digivolutionRequirement).toEqual([
      {
        names: ["Takuya Kanbara"],
        cost: 4,
        isAlternate: true,
        baseIsTamer: true,
        minTraitStackCount: 5,
        minTraitStackTraits: ["Hybrid"],
      },
    ]);
  });

  it("encodes Blocker, DP-relative deletion, color scaling, and end-of-turn unsuspend", () => {
    const card = runtimeCompiledCard("P-185")!;
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          scaling: { per: 1, unit: "colors", filter: { controllerDefault: "mine" } },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
  });

  it("exposes Blocker on the live EmperorGreymon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-185", as: "emperor" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("emperor"), "Blocker")).toBe(true);
  });

  it("deletes at its DP boundary, scales its DP by allied colors, and unsuspends at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-185", dp: 10000, suspended: true, as: "emperor" },
            { card: "P-016", as: "purple" },
            { card: "BT1-063", as: "yellow" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 10000, as: "equal" },
            { card: "BT1-009", dp: 11000, as: "over" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("emperor"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("emperor").currentDP).toBe(15000);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("emperor"));
    expect(s.perm("emperor").isSuspended).toBe(false);
  });
});

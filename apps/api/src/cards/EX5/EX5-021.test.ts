import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-021.js";
import "../index.js";

describe("EX5-021 Majiramon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] },
    ]);
  });
  it("gains memory when using an Option costing at least one and as an inherited trait effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionUsed",
      fireCondition: { kind: "triggerOptionCostAtLeast", value: 1 },
      actions: [{ kind: "GainMemory", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ match: "trait", tokens: ["Four Sovereigns", "God Beast"] }] },
          },
        },
      ],
    });
  });

  it("plays only a unique Deva into breeding without activating its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-009", as: "existingDeva" }],
          hand: [
            { card: "EX5-021", as: "majiramon" },
            { card: "EX5-009", as: "duplicate" },
            { card: "EX5-010", as: "uniqueDeva" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("majiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX5-010");

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX5-010");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX5-009", "BT1-009"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("gains memory only for an Option with use cost at least one", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX5-021", as: "majiramon" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 0, subjectPermanentId: "free" });
    expect(s.state.memory).toBe(0);
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 1, subjectPermanentId: "paid" });
    expect(s.state.memory).toBe(1);
  });

  it("gains inherited memory once per turn only for a Four Sovereigns host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-029", as: "host", under: ["EX5-021"] }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });
});

import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-022.js";
import "../index.js";

describe("EX5-022 Mihiramon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] },
    ]);
  });
  it("trashes one digivolution card from an opposing Digimon when one of your Digimon is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
          amount: 1,
          fromTop: true,
        },
      ],
    });
  });
  it("gains memory once per turn when inherited and traited", () => {
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
            { card: "EX5-022", as: "mihiramon" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihiramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX5-010");

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX5-010");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX5-009", "BT1-009"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("trashes one opposing digivolution card when your Digimon is played, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-022", as: "mihiramon" }],
          hand: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.state.players[0]!.hand[0]!.instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
  });

  it("gains inherited memory once per turn only for a Four Sovereigns host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-029", as: "host", under: ["EX5-022"] }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });
});

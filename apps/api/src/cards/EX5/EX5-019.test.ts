import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-019.js";
import "../index.js";

describe("EX5-019 Antylamon", () => {
  it("draws and plays a unique Deva into breeding on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", breeding: true, notSameNameAs: ["battleArea", "trash"] },
    ]);
  });
  it("trashes one digivolution card from an opposing Digimon when attacking and gains memory with its trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
      amount: 1,
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

  it("plays only a unique Deva into breeding and does not fire its On Play effect there", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-009", as: "existingDeva" }],
          hand: [
            { card: "EX5-019", as: "antylamon" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("antylamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX5-010");

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("EX5-010");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX5-009", "BT1-009"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("trashes the bottom card of an opponent's digivolution stack on attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-019", as: "antylamon" }] },
        1: {
          battleArea: [{ card: "BT1-030", as: "target", under: ["BT1-009", "BT1-010"] }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("gains inherited memory once per turn only for a Four Sovereigns host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-029", as: "host", under: ["EX5-019"] }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });
});

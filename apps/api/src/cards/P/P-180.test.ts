import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-180.js";

describe("P-180 Bind Red Trigger", () => {
  it("deletes the highest-DP opposing Digimon from its Security effect", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-180", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 5000, as: "low" },
            { card: "BT1-009", dp: 7000, as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle();
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("high").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("low").instanceId)).toBe(true);
  });
  it("deletes an opponent Digimon at 7000 DP or less when this card is trashed from a stack", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: {
                count: 1,
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } },
              },
            },
          ],
        },
      ],
    });
  });

  it("deletes a qualifying opponent through the real stack-trash event", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "P-180", as: "source" }] }] },
        1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("waives its color requirement while you have a Three Musketeers Digimon", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] } },
        },
      ],
    });
  });

  it("trashes the opponent's top security card and places itself under a Three Musketeers Digimon", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "SecurityManipulation", op: "trash", controller: "opponent", amount: 1, toTop: true },
        {
          kind: "PlaceUnder",
          position: "bottom",
          underFilter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] },
        },
      ],
    });
  });

  it("deletes the opponent's highest-DP Digimon in Security", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "Delete",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" } },
        },
      ],
    });
  });

  it("trashes the opponent's top security and places itself under a Three Musketeers Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-180", as: "option" }],
          battleArea: [{ card: "BT6-112", as: "musketeer" }],
          security: ["BT1-005"],
        },
        1: { security: ["BT1-006", "BT1-007"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        s.perm("musketeer").stack.some((card) => card.instanceId === s.inst("option").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("musketeer").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("uses the card without a matching color while a Three Musketeers Digimon is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-180", as: "option" }],
          battleArea: [{ card: "BT6-112", as: "musketeer" }],
          security: ["BT1-005"],
        },
        1: { security: ["BT1-006"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("musketeer").stack.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-222.js";

describe("P-222 Rosemon", () => {
  it("reduces play cost by 4 only with a face-up Wind Guardians security card", () => {
    expect(runtimeCompiledCard("P-222")!.effects.find((effect) => effect.trigger === "BeforePayCost")).toMatchObject({
      actions: [
        {
          kind: "CostModifier",
          costType: "play",
          mode: "reduce",
          amount: 4,
          handResident: true,
          condition: expect.any(Object),
        },
      ],
    });
  });

  it("may suspend any Digimon on play and digivolving", () => {
    const card = runtimeCompiledCard("P-222")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            optional: true,
            target: { count: 1, filter: { controllerDefault: "any", kind: ["Digimon"] } },
          },
        ],
      });
    }
  });

  it("once per turn may delete an opponent's lowest DP Digimon when any of yours suspends", () => {
    expect(runtimeCompiledCard("P-222")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Delete",
              optional: true,
              target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" } },
            },
          ],
        },
      ],
    });
  });
});

import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-222 engine behavior", () => {
  it("reduces the real play cost by 4 with a face-up Wind Guardians security card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-222", as: "rosemon" }],
        battleArea: [{ card: "BT1-067", as: "greenSource" }],
        security: [{ card: "BT21-095", faceUp: true }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rosemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("rosemon").instanceId),
    );
    // Rosemon costs 11; the face-up Wind Guardians card reduces payment to 7.
    expect(s.state.memory).toBe(3);
  });

  it("suspends a Digimon on play and resolves the once-per-turn lowest-DP deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-222", as: "rosemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rosemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("rosemon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("allows declining the optional suspension and leaves the opposing Digimon intact", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-222", as: "rosemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rosemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-222"));
    expect(s.perm("rosemon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not reduce play cost with face-down security", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-222", as: "rosemon" }], security: [{ card: "BT21-095" }] } });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rosemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-222"));
    expect(s.state.memory).toBe(9);
  });

  it("does not reduce play cost with a face-up non-Wind Guardians security card", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "P-222", as: "rosemon" }], security: [{ card: "BT1-090", faceUp: true }] },
    });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rosemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-222"));
    expect(s.state.memory).toBe(9);
  });
});

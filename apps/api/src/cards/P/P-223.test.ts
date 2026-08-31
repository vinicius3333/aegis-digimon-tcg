import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-223.js";
import "../ST22/ST22-10.js";

describe("P-223 Kuzuhamon", () => {
  it("reduces play cost by 4 with three or fewer security cards", () => {
    expect(runtimeCompiledCard("P-223")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 4,
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
            },
          ],
        },
      ],
    });
  });

  it("uses one matching Onmyōjutsu or Plug-In Option from hand or trash", () => {
    const card = runtimeCompiledCard("P-223")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "UseOptionWithoutCost",
            filter: {
              kind: ["Option"],
              playCostLte: 99,
              nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
            },
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
          },
        ],
      });
    }
  });

  it("once per turn may play a Pipe Fox Token after a genuine Option use", () => {
    expect(runtimeCompiledCard("P-223")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          sourceFilter: { controller: "mine", kind: ["Option"] },
          actions: [{ kind: "PlayToken", tokens: ["Pipe Fox"], count: 1, payCost: false, optional: true }],
        },
      ],
    });
  });
});

describe("P-223 engine behavior", () => {
  it("uses a cost-6 Onmyōjutsu Option from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-223", as: "kuzuhamon" },
            { card: "ST22-10", as: "onmyojutsu" },
          ],
          battleArea: [
            { card: "P-016", as: "purple" },
            { card: "BT1-063", as: "yellow" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();
    const optionId = s.inst("onmyojutsu").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuzuhamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === optionId && card.faceUp)).toBe(true);
  });

  it("allows refusing the optional cost-6 Option use", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-223", as: "kuzuhamon" },
            { card: "ST22-10", as: "onmyojutsu" },
          ],
          battleArea: [
            { card: "P-016", as: "purple" },
            { card: "BT1-063", as: "yellow" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 20;
    await s.ready();
    const optionId = s.inst("onmyojutsu").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuzuhamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
  });
});

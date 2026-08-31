import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-222.js";

describe("P-222 Rosemon", () => {
  it("reduces play cost by 4 only with a face-up Wind Guardians security card", () => {
    expect(runtimeCompiledCard("P-222")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 4,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "security",
                  faceUp: true,
                  nameOrTrait: [{ tokens: ["Wind Guardians"], match: "nameExact" }],
                },
              },
            },
          ],
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

import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-222 engine behavior", () => {
  it("suspends a Digimon on play and resolves the once-per-turn lowest-DP deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-222", as: "rosemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rosemon"));
    await settle();
    expect(s.perm("rosemon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("allows declining the optional suspension and leaves the opposing Digimon intact", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-222", as: "rosemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("rosemon"));
    await settle();
    expect(s.perm("rosemon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

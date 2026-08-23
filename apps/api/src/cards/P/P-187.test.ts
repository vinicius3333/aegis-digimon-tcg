import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-187.js";

describe("P-187 Mastemon", () => {
  it("recovers independently of DNA and conditionally places any other Digimon or Tamer for DNA", () => {
    const card = runtimeCompiledCard("P-187")!;
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving" && effect.keywords)).toMatchObject({
      keywords: [{ keyword: "Recovery", amount: 1 }],
    });
    expect(card.effects.find((effect) => effect.actions?.[0]?.kind === "SecurityManipulation")).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "isDnaDigivolving" },
          cost: {
            kind: "place",
            destination: "security",
            position: "choice",
            target: { count: 1, filter: { controller: "any", excludeSelf: true, kind: ["Digimon", "Tamer"] } },
          },
        },
      ],
    });
  });

  it("shares one once-per-turn top-security cost across digivolving and attacking", () => {
    const card = runtimeCompiledCard("P-187")!;
    const effects = card.effects.filter(
      (effect) => effect.trigger === "WhenDigivolving" || effect.trigger === "WhenAttacking",
    );
    expect(effects).toHaveLength(4);
    const plays = effects.filter((effect) => effect.actions?.[0]?.kind === "PlayWithoutCost");
    expect(plays).toHaveLength(2);
    expect(plays.map((effect) => effect.sharedUseKey)).toEqual([
      "trashSecurityPlayDigimon",
      "trashSecurityPlayDigimon",
    ]);
    expect(plays[0]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          cost: {
            kind: "trash",
            target: { count: 1, filter: { controller: "mine", zone: "security", position: "top" } },
          },
          target: { count: 1, filter: { colors: ["Yellow", "Purple"], dp: { op: "lte", value: 6000 } } },
        },
      ],
    });
  });
});

import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-088.js";
import "../index.js";

describe("BT16-088", () => {
  it("plays Armadillomon or Patamon and returns that Digimon at opponent-turn end", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          bindResultAs: "playedArmadillomonOrPatamon",
        },
        {
          kind: "SubTrigger",
          event: "endOfOpponentTurn",
          once: true,
          on: { filter: { boundRef: "playedArmadillomonOrPatamon" }, count: 1 },
          actions: [{ kind: "Return", to: "hand" }],
        },
      ],
    });
  });

  it("gains memory by suspending itself when a yellow or black Digimon digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
            {
              kind: "DeDigivolve",
              amount: 1,
              condition: { kind: "allOf", conditions: [{ kind: "isDnaDigivolving" }, { kind: "ifThisEffectActed" }] },
            },
          ],
        },
      ],
    });
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("optional");
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.actions?.[1]).not.toHaveProperty("abortOnDecline");
  });

  it("plays itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("returns the Digimon played by the start-phase effect through public turn progression", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-088", as: "tamer" }], hand: [{ card: "BT1-027", as: "armadillomon" }] },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-027")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-027")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("armadillomon").instanceId)).toBe(true);
  });
});

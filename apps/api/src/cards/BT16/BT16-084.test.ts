import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-084.js";
import "../index.js";

describe("BT16-084", () => {
  it("plays Hawkmon or Salamon and returns that Digimon at opponent-turn end", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          bindResultAs: "playedHawkmonOrSalamon",
        },
        {
          kind: "SubTrigger",
          event: "endOfOpponentTurn",
          once: true,
          on: { filter: { boundRef: "playedHawkmonOrSalamon" }, count: 1 },
          actions: [{ kind: "Return", to: "hand" }],
        },
      ],
    });
  });

  it("gains memory by suspending itself when a red or yellow Digimon digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
            {
              kind: "ModifyDP",
              amount: -3000,
              condition: { kind: "allOf", conditions: [{ kind: "isDnaDigivolving" }, { kind: "ifThisEffectActed" }] },
            },
          ],
        },
      ],
    });
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
        0: { battleArea: [{ card: "BT16-084", as: "tamer" }], hand: [{ card: "BT8-026", as: "hawkmon" }] },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.turnSeat = 0;
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT8-026")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT8-026")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hawkmon").instanceId)).toBe(true);
  });
});

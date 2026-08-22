import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-100.js";
import "../index.js";

describe("BT16-100 Thunderflame Crusher", () => {
  it("waives color with Pulsemon text and scales its optional security payment", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: { kind: "trashSecurityTopUpToLeave", leaveCount: 3 },
          amount: { kind: "perPaid", value: 2 },
        },
      ],
    });
  });

  it("uses publicly, trashes security to 3, deletes level 5, and pays the reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-039", as: "pulsemon" }],
          hand: [{ card: "BT16-100", as: "option" }],
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT16-020", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-020"),
      3000,
    );
    expect(s.state.players[0]?.security).toHaveLength(3);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]?.battleArea.map((permanent) => permanent.topCard?.cardId)).not.toContain("BT16-020");
  });

  it("places itself at security bottom after Main when the stack has 2 or fewer cards", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          toTop: false,
          condition: { kind: "securityAtMost", value: 2 },
        },
      ],
    });
  });

  it("gives an opposing Digimon -15000 DP from security", () => {
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ModifyDP", amount: -15000, duration: "forTheTurn" }],
    });
  });
});

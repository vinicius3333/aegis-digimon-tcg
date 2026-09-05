import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-019.js";
import "./EX2-023.js";
import "../BT4/BT4-104.js";
import "../BT1/BT1-102.js";

describe("EX2-019 Renamon", () => {
  it("reveals four and adds a named evolution and Rika", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-019", as: "renamon" }],
          deck: [
            { card: "EX2-021", as: "kyubimon" },
            { card: "EX2-060", as: "rika" },
            "EX2-014",
            "EX2-015",
            "EX2-031",
            "EX2-032",
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") === "EX2-031,EX2-032,EX2-014,EX2-015",
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("kyubimon").instanceId, s.inst("rika").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-031", "EX2-032", "EX2-014", "EX2-015"]);
  });

  it("gains memory only for a cost-2 Option, then only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-023", as: "host", under: ["EX2-019"] }],
          hand: [
            { card: "BT4-104", as: "cheap" },
            { card: "BT1-102", as: "option1" },
            { card: "BT1-102", as: "option2" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cheap").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT4-104"));
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 1);
    expect(s.state.memory).toBe(6);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-102").length === 2);
    expect(s.state.memory).toBe(4);
  });
});

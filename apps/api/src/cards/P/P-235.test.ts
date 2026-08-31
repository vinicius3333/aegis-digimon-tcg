import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-235.js";

describe("P-235 Digital Accident Tactics Squad", () => {
  it("requires a DATA SQUAD trait card and reveals three cards", () => {
    const effects = runtimeCompiledCard("P-235")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        actions: [
          expect.objectContaining({
            kind: "WaiveColorRequirement",
            condition: expect.objectContaining({ kind: "youHave" }),
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("gains two memory through Delay", () => {
    expect(runtimeCompiledCard("P-235")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [{ kind: "GainMemory", amount: 2 }],
      }),
    );
  });

  it("places itself in the battle area from Security", () => {
    expect(runtimeCompiledCard("P-235")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlaceInBattleAreaSelf" }],
      }),
    );
  });
});
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-235 engine behavior", () => {
  it("adds a DATA SQUAD card from the top three and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-235", as: "squad" }],
          deck: [{ card: "AD1-016", as: "dataSquad" }, "BT1-001", "BT1-002"],
          battleArea: ["BT1-063"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("squad").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("dataSquad").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-235")).toBe(true);
  });
});

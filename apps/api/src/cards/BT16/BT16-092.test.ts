import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-092.js";

describe("BT16-092", () => {
  it("plays ExVeemon or Stingmon and DNA digivolves in the main phase", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "DnaDigivolve",
      payCost: true,
      optional: true,
      bindResultAs: "dnaDigivolvedByThisEffect",
    });
  });

  it("protects the DNA result from battle deletion and grants Blocker", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "Restrict",
      restriction: "beDeletedInBattle",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      duration: "untilOpponentTurnEnd",
      condition: { kind: "bindingExists" },
    });
  });

  it("plays Veemon or Wormmon from hand/trash and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("publicly plays an ExVeemon without requiring DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-018", as: "color" },
            { card: "BT16-039", as: "green" },
          ],
          hand: [
            { card: "BT16-092", as: "option" },
            { card: "BT16-018", as: "exveemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-018"));
    expect(s.state.players[0]?.battleArea.some((p) => p.topCard?.cardId === "BT16-018")).toBe(true);
    expect(s.state.players[0]?.hand.some((card) => card.cardId === "BT16-092")).toBe(false);
  });
});

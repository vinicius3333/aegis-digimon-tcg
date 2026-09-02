import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_009 } from "./BT25-009.js";
import "../index.js";

describe("BT25-009 Bearmon", () => {
  it("matches the catalog identity and Iliad TS traits", () => {
    expect(getCardDefinition("BT25-009")).toMatchObject({
      cardId: "BT25-009",
      nameEn: "Bearmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast", "Iliad", "TS"],
    });
  });

  it("offers the free hand digivolution only at 4 or less memory", () => {
    const effect = BT25_009.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "memoryAtMost", controller: "mine", value: 4 },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
      },
    });
  });

  it("preserves inherited +1000 DP", () => {
    expect(BT25_009.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("free-digivolves into an eligible Beast at exactly 4 of its own memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "BT11-010", as: "grizzlymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("bearmon").topCard.instanceId === s.inst("grizzlymon").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("bearmon").stack.map((card) => card.cardId)).toEqual(["BT25-009"]);
    expect(s.perm("bearmon").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not trigger during the opponent's start-of-main window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "BT11-010", as: "grizzlymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("bearmon").topCard.cardId).toBe("BT25-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT11-010"]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("does not activate above the 4-memory boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "BT11-010", as: "grizzlymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("bearmon").topCard.cardId).toBe("BT25-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT11-010"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("can be reached through its zero-cost TS level-2 evolution and passes on its inherited DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-001", as: "tokomon" }],
          hand: [
            { card: "BT25-009", as: "bearmon" },
            { card: "BT11-010", as: "grizzlymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tokomon").permanentId,
        instanceId: s.inst("bearmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tokomon").topCard.instanceId === s.inst("bearmon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("tokomon").stack.map((card) => card.cardId)).toEqual(["BT25-001"]);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("tokomon").topCard.instanceId === s.inst("grizzlymon").instanceId);
    expect(s.perm("tokomon").stack.map((card) => card.cardId)).toEqual(["BT25-001", "BT25-009"]);
    expect(s.perm("tokomon").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});

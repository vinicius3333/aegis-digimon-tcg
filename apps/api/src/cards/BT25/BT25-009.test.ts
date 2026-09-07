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
        or: [
          {
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
            nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
          },
          { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
        ],
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

  it("does not attempt the level-5 Sea Animal+TS near-match because ordinary evolution is level-guarded", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "BT24-029", as: "seaAnimalTs" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("bearmon").topCard.cardId).toBe("BT25-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT24-029"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("supports a public optional refusal without changing hand, memory, or stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "BT11-010", as: "grizzlymon" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT11-010"]);
    expect(s.perm("bearmon").stack.map((card) => card.cardId)).toEqual([]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("accepts the TS-only public alternate destination Deltamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "BT25-068", as: "deltamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bearmon").permanentId,
        instanceId: s.inst("deltamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bearmon").topCard.cardId === "BT25-068");

    expect(s.state.memory).toBe(3);
    expect(s.perm("bearmon").stack.map((card) => card.cardId)).toEqual(["BT25-009"]);
  });

  it("matches a legal non-TS Beastkin destination through the printed family substring", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "EX12-012", as: "apemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("bearmon").topCard.cardId === "EX12-012");

    expect(s.state.memory).toBe(4);
    expect(s.perm("bearmon").stack.map((card) => card.cardId)).toEqual(["BT25-009"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("rejects a legal nonfamily, non-TS destination", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-009", as: "bearmon" }],
          hand: [{ card: "BT1-015", as: "nonMatching" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("bearmon").topCard.cardId).toBe("BT25-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-015"]);
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

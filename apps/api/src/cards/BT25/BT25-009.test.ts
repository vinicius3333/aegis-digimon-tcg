import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_009 } from "./BT25-009.js";
import "../index.js";

describe("BT25-009 Bearmon", () => {
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

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("bearmon"));
    await settle(() => s.perm("bearmon").topCard.instanceId === s.inst("grizzlymon").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("bearmon").stack.map((card) => card.cardId)).toEqual(["BT25-009"]);
    expect(s.perm("bearmon").currentDP).toBe(6000);
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

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("bearmon"));

    expect(s.perm("bearmon").topCard.cardId).toBe("BT25-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT11-010"]);
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

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("bearmon"));

    expect(s.perm("bearmon").topCard.cardId).toBe("BT25-009");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT11-010"]);
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

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tokomon"));
    await settle(() => s.perm("tokomon").topCard.instanceId === s.inst("grizzlymon").instanceId);
    expect(s.perm("tokomon").stack.map((card) => card.cardId)).toEqual(["BT25-001", "BT25-009"]);
    expect(s.perm("tokomon").currentDP).toBe(6000);
  });
});

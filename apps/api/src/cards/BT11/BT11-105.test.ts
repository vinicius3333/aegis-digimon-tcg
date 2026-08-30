import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-105.js";
import "./BT11-061.js";

describe("BT11-105 Fusionize", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-105")).toMatchObject({ cardId: "BT11-105", colors: ["Black"], kinds: ["Option"], playCost: 1 });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      { trigger: "Main", actions: [{ kind: "PlaceUnder" }, { kind: "Digivolve" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "RevealAdd", revealCount: 3 }] },
    ]);
  });

  it("places Vemmon under the host and digivolves into Destromon from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-065", as: "host" }],
          hand: [{ card: "BT11-105", as: "option" }],
          trash: ["BT11-061", "BT11-070"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT11-070");

    expect(s.perm("host").topCard?.cardId).toBe("BT11-070");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("BT11-061");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT11-061");
  });

  it("Q2133: places Vemmon even when no Destromon or Galacticmon is in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-065", as: "host" }],
          hand: [{ card: "BT11-105", as: "option" }],
          trash: ["BT11-061"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some(({ cardId }) => cardId === "BT11-061"));

    expect(s.perm("host").topCard?.cardId).toBe("BT11-065");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("BT11-061");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT11-061");
  });

  it("does not digivolve when the required trash placement cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-065", as: "host" }],
          hand: [{ card: "BT11-105", as: "option" }],
          trash: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("host").topCard?.cardId).toBe("BT11-065");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("Security reveals three cards, plays Vemmon, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT11-105", as: "option", faceUp: true }],
          deck: [{ card: "BT11-061", as: "vemmon" }, "BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoAcceptOptional: true },
    );
    const optionId = s.inst("option").instanceId;
    const vemmonId = s.inst("vemmon").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === vemmonId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === vemmonId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-116.js";

describe("P-116 DIGIMON CON 2023", () => {
  it("reveals two, adds all eligible low-cost Tamers, and returns the rest to the top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", as: "white" }],
          hand: [{ card: "P-116", as: "option" }],
          deck: [
            { card: "BT10-092", as: "tamer" },
            { card: "BT1-009", as: "nonTamer" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("nonTamer").instanceId);
    assertNoLoudGap(s);
  });

  it("costs zero while Agumon, Pulsemon, and Gammamon are present", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT17-074", "BT1-010", "BT10-031", "BT8-008"],
        hand: [{ card: "P-116", as: "option" }],
        deck: [{ card: "BT10-092", as: "tamer" }, "BT1-009"],
      },
    });
    s.state.memory = 0;
    s.state.phase = Phase.Main;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("requires all three named Digimon rather than a subset", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT17-074", "BT1-010", "BT10-031"],
        hand: [{ card: "P-116", as: "option" }],
        deck: [{ card: "BT10-092", as: "tamer" }, "BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-092"));
    expect(s.state.memory).toBe(-2);
  });

  it("does not set the cost to zero when none of the three names is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-009"],
        hand: [{ card: "P-116", as: "option" }],
        deck: [{ card: "BT10-092", as: "tamer" }, "BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId }).ok).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "P-116")).toBe(true);
  });

  it("Q4224: combines named Digimon across both players", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT17-074", "BT1-010"],
        hand: [{ card: "P-116", as: "option" }],
        deck: [{ card: "BT10-092", as: "tamer" }, "BT1-009"],
      },
      1: { battleArea: ["BT10-031", "BT8-008"] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-092"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-092")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("requires an exact Agumon name and does not accept Agumon Expert", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT17-074", "BT1-011", "BT10-031", "BT8-008"],
        hand: [{ card: "P-116", as: "option" }],
        deck: [{ card: "BT10-092", as: "tamer" }, "BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-092"));
    expect(s.state.memory).toBe(-2);
  });

  it("activates the same reveal effect from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "P-116", as: "option" }],
        deck: [{ card: "BT10-092", as: "tamer" }, "BT1-009"],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-092"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-092")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-002.js";

const sevenCards = ["BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029"];

describe("LM-002 Jellymon", () => {
  it("draws at the start of its owner's main phase with seven cards in hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-002", as: "jellymon" }], hand: [...sevenCards], deck: ["BT1-027"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("jellymon"));

    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("does not draw with eight cards in hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-002", as: "jellymon" }], hand: [...sevenCards, "BT1-029"], deck: ["BT1-027"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("jellymon"));

    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("stays silent on the opponent's main phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-002", as: "jellymon" }], hand: [...sevenCards], deck: ["BT1-027"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("jellymon"));

    expect(s.state.players[0]!.hand).toHaveLength(7);
  });

  it("draws only once from two copies at exactly seven cards, per Q3989", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-002", as: "first" },
            { card: "LM-002", as: "second" },
          ],
          hand: [...sevenCards],
          deck: ["BT1-027", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("first"));
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("second"));

    // The first draw puts the hand at 8, so the second copy's condition no longer holds.
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("draws from the inherited clause when a Digimon carrying it attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-004", as: "host", under: ["LM-002"] }],
          hand: [...sevenCards],
          deck: ["BT1-027"],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length >= 8, 2000);

    expect(s.state.players[0]!.hand.length).toBeGreaterThanOrEqual(8);
  });

  it("draws only once from two inherited copies at exactly seven cards, per Q3990", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-004", as: "host", under: ["LM-002", "LM-002"] }],
          hand: [...sevenCards],
          deck: ["BT1-027", "BT1-028"],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length >= 8, 2000);

    // The first inherited activation takes the hand from 7 to 8, making the second ineligible.
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-002");
    const compiled = runtimeCompiledCard("LM-002");
    expect(definition?.nameEn).toBe("Jellymon");
    expect(definition?.level).toBe(3);
    expect(definition?.dp).toBe(1000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.some((effect) => effect.isInherited === true)).toBe(true);
  });
});

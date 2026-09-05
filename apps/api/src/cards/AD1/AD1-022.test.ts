import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-022 Izzy Izumi & Tai Kamiya", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-022");
    const compiled = registeredCompiledCards.get("AD1-022") ?? getCompiledCard("AD1-022");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-022");
    expect(definition?.nameEn).toBe("Izzy Izumi & Tai Kamiya");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("suspends itself and digivolves a Digimon when another ADVENTURE card is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-022", as: "tamer" },
            { card: "ST20-10", as: "base" },
          ],
          hand: [
            { card: "AD1-001", as: "trigger" },
            { card: "AD1-001", as: "evolve" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard.cardId === "AD1-001" && s.perm("tamer").isSuspended);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("AD1-001");
    expect(s.state.memory).toBe(4);
  });

  it("reduces only this effect's digivolution cost by 2 with four Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-022", as: "tamer" },
            { card: "AD1-023", as: "additional-colors" },
            { card: "ST20-10", as: "base" },
          ],
          hand: [
            { card: "AD1-001", as: "trigger" },
            { card: "AD1-001", as: "evolve" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard.cardId === "AD1-001");
    expect(s.state.memory).toBe(5);
  });

  it("does not reduce an unrelated manual digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-022", as: "tamer" },
          { card: "ST20-10", as: "base" },
        ],
        hand: [{ card: "AD1-001", as: "evolve" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolve").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "AD1-001");
    expect(s.state.memory).toBe(3);
  });

  it("gains 1 memory at start of main only if the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-022", as: "tamer" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory at start of main when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-022", as: "tamer" }] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));

    expect(s.state.memory).toBe(0);
  });

  it("does not react when an unrelated non-ADVENTURE card is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-022", as: "tamer" },
            { card: "ST20-10", as: "base" },
          ],
          hand: [
            { card: "BT1-010", as: "unrelated" },
            { card: "AD1-001", as: "evolve" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unrelated").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("ST20-10");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolve").instanceId)).toBe(true);
  });
});

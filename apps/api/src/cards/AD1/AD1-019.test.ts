import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-019 Matt Ishida & T.K. Takaishi", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-019");
    const compiled = registeredCompiledCards.get("AD1-019") ?? getCompiledCard("AD1-019");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-019");
    expect(definition?.nameEn).toBe("Matt Ishida & T.K. Takaishi");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("suspends itself and plays an ADVENTURE card after an ADVENTURE digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-019", as: "tamer" },
            { card: "ST20-10", as: "base" },
          ],
          hand: [
            { card: "AD1-001", as: "evolving" },
            { card: "AD1-001", as: "adventure" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (perm) => perm.topCard.cardId === "AD1-001" && perm.permanentId !== s.perm("base").permanentId,
      ),
    );
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("reduces the effect's paid play cost by 2 with four distinct Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-019", as: "tamer" },
            { card: "AD1-023", as: "additional-colors" },
            { card: "ST20-10", as: "base" },
          ],
          hand: [
            { card: "AD1-001", as: "evolving" },
            { card: "AD1-001", as: "adventure" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "AD1-001").length === 2,
    );

    expect(s.state.memory).toBe(5);
  });

  it("can play an ADVENTURE Tamer rather than only a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-019", as: "tamer" },
            { card: "ST20-10", as: "base" },
          ],
          hand: [
            { card: "AD1-001", as: "evolving" },
            { card: "AD1-019", as: "adventure-tamer" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "AD1-019").length === 2,
    );

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "AD1-019")).toHaveLength(
      2,
    );
  });

  it("gains 1 memory at start of main only while the opponent has a Digimon", async () => {
    const qualified = setupEngine({
      0: { battleArea: [{ card: "AD1-019", as: "tamer" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    qualified.state.memory = 0;
    await advance(qualified.engine).fire(EffectTiming.OnStartMainPhase, qualified.perm("tamer"));
    expect(qualified.state.memory).toBe(1);

    const unqualified = setupEngine({ 0: { battleArea: [{ card: "AD1-019", as: "tamer" }] } });
    unqualified.state.memory = 0;
    await advance(unqualified.engine).fire(EffectTiming.StartOfYourMainPhase, unqualified.perm("tamer"));
    expect(unqualified.state.memory).toBe(0);
  });

  it("can decline the optional ADVENTURE play after a qualifying evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-019", as: "tamer" },
            { card: "ST20-10", as: "base" },
          ],
          hand: [
            { card: "AD1-001", as: "evolving" },
            { card: "AD1-001", as: "adventure" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "AD1-001");
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("adventure").instanceId)).toBe(true);
  });
});

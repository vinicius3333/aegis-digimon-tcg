import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../../cards/index.js";

describe("AD1-001 Greymon", () => {
  it("returns a matching Greymon-family card from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-001", as: "greymon" }],
          trash: [{ card: "AD1-010", as: "trashGarurumon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(
      false,
    );
  });

  it("returns a matching Greymon-family card from trash when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-02", as: "base" }],
          hand: [{ card: "AD1-001", as: "greymon" }],
          trash: [{ card: "AD1-010", as: "trashGarurumon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId),
    );

    expect(s.perm("base").topCard?.cardId).toBe("AD1-001");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(
      false,
    );
  });

  it("allows the printed level-3 ADVENTURE and Omnimon-in-text digivolution routes for cost 2", async () => {
    for (const baseCardId of ["ST20-02", "BT12-059"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "AD1-001", as: "greymon" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = 2;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("greymon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-001");

      expect(s.perm("base").topCard?.cardId).toBe("AD1-001");
      expect(s.state.memory).toBe(0);
    }
  });

  it("may free-digivolve itself into a Greymon when a Garurumon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "source" }],
          hand: [
            { card: "AD1-010", as: "garurumon" },
            { card: "BT1-021", as: "metalGreymon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard?.cardId === "BT1-021");

    expect(s.perm("source").topCard?.cardId).toBe("BT1-021");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(false);
    expect(s.state.memory).toBe(5);
  });

  it("may free-digivolve itself when a Tai Kamiya Tamer is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "source" }],
          hand: [
            { card: "BT1-085", as: "tai" },
            { card: "BT1-021", as: "metalGreymon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tai").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT1-021");

    expect(s.perm("source").topCard?.cardId).toBe("BT1-021");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(false);
    expect(s.state.memory).toBe(6);
  });

  it("does not retrigger after it digivolves into Garurumon, per Q6050", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "source", under: ["AD1-001"] }],
          hand: [
            { card: "AD1-010", as: "garurumon" },
            { card: "BT1-021", as: "metalGreymon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    await advance(s.engine).verb.playInstances([s.inst("garurumon").instanceId]);
    await settle();

    expect(s.perm("source").topCard?.cardId).toBe("AD1-010");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(true);
  });

  it("allows the optional trash return to be declined", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "AD1-001", as: "greymon" }], trash: [{ card: "AD1-010", as: "trashGarurumon" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashGarurumon").instanceId)).toBe(
      true,
    );
  });

  it("grants Raid from the evolution stack and redirects to the highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-021", dp: 7000, as: "attacker", under: ["AD1-001"] }] },
        1: {
          battleArea: [
            { card: "BT1-001", dp: 9000, as: "highest" },
            { card: "BT1-001", dp: 3000, as: "lower" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const highestId = s.perm("highest").permanentId;
    const lowerId = s.perm("lower").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== attackerId), 5000);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowerId)).toBe(true);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-001", as: "greymon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-001");
    const compiled = registeredCompiledCards.get("AD1-001") ?? getCompiledCard("AD1-001");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-001");
    expect(definition?.nameEn).toBe("Greymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });
});

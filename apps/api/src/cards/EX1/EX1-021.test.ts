import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-021.js";

describe("EX1-021 MetalGarurumon", () => {
  it("gains 1 memory for every 4 cards in hand when digivolving", async () => {
    const filler = Array.from({ length: 8 }, () => "BT1-029");
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-017", as: "base" }], hand: [...filler, { card: "EX1-021", as: "evo" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("bottom-decks an On Deletion Digimon and trashes all of its sources with 8 cards and a Tamer", async () => {
    const hand = Array.from({ length: 8 }, () => "BT1-029");
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-021", as: "metalGarurumon" },
            { card: "ST2-12", as: "tamer" },
          ],
          hand,
        },
        1: {
          battleArea: [
            {
              card: "BT1-035",
              as: "target",
              under: [
                { card: "BT1-004", as: "eggSource" },
                { card: "BT1-030", as: "source1" },
              ],
            },
          ],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    const sourceIds = [s.inst("eggSource").instanceId, s.inst("source1").instanceId];
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-035");
    expect(sourceIds.every((id) => s.state.players[1]!.trash.some((card) => card.instanceId === id))).toBe(true);
  });

  it("applies exactly one memory for seven cards remaining after digivolution", async () => {
    const filler = Array.from({ length: 7 }, () => "BT1-029");
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-017", as: "base" }], hand: [...filler, { card: "EX1-021", as: "evo" }] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-021");
    expect(s.state.memory).toBe(2);
  });

  it("gains exactly 1 memory with 5 cards remaining in hand (Q3207)", async () => {
    const filler = Array.from({ length: 5 }, () => "BT1-029");
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-017", as: "base" }], hand: [...filler, { card: "EX1-021", as: "evo" }] },
    });
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.memory).toBe(3);
  });

  it("gains no memory with only three cards remaining in hand", async () => {
    const filler = Array.from({ length: 3 }, () => "BT1-029");
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-017", as: "base" }], hand: [...filler, { card: "EX1-021", as: "evo" }] },
    });
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-021");
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.memory).toBe(2);
  });

  it("targets a Digimon that gained On Deletion from a digivolution card (Q3208)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-021", as: "metalGarurumon" },
            { card: "ST2-12", as: "tamer" },
          ],
          hand: Array.from({ length: 8 }, () => "BT1-029"),
        },
        1: {
          battleArea: [{ card: "BT1-032", as: "target", under: ["BT1-030"] }],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-032");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-030")).toBe(true);
  });

  it("does not return a target when eight cards are held but no Tamer is in play", async () => {
    const hand = Array.from({ length: 8 }, () => "BT1-029");
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-021", as: "metalGarurumon", under: ["EX1-017"] }], hand },
        1: {
          battleArea: [{ card: "EX1-034", as: "target", dp: 10000, suspended: true }],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalGarurumon").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not return a target with a Tamer when fewer than eight cards are held", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-021", as: "metalGarurumon", under: ["EX1-017"] },
            { card: "ST2-12", as: "tamer" },
          ],
          hand: Array.from({ length: 7 }, () => "BT1-029"),
        },
        1: {
          battleArea: [{ card: "BT1-035", as: "target", dp: 10000, suspended: true, under: ["BT1-030"] }],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalGarurumon").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("can resolve the return on each attack because it has no once-per-turn limit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-021", as: "firstMetal" },
            { card: "EX1-021", as: "secondMetal" },
            { card: "ST2-12", as: "tamer" },
          ],
          hand: Array.from({ length: 8 }, () => "BT1-029"),
        },
        1: {
          battleArea: [
            { card: "BT1-035", as: "firstTarget", under: ["BT1-030"] },
            { card: "BT1-032", as: "secondTarget", under: ["BT1-030"] },
          ],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attack = (attacker: string) =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "player" as const },
      });
    expect(attack("firstMetal")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(attack("secondMetal")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT1-035", "BT1-032"]);
  });
});

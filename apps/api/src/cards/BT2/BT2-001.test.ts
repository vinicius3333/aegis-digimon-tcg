import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT2-001.js";

describe("BT2-001 Gigimon", () => {
  it("matches the catalog and carries the complete inherited threshold aura", () => {
    expect(getCardDefinition("BT2-001")).toMatchObject({
      cardId: "BT2-001",
      set: "BT2",
      nameEn: "Gigimon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      inheritedEffectText:
        "[Your Turn] While there are 5 or more cards in your opponent's trash, this Digimon gets +1000 DP.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT2-001",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Aura",
            effect: { kind: "modifyDP", amount: 1000 },
            while: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 5 },
          }),
        ],
      }),
    ]);
  });

  it("gives +1000 DP during its turn at the 5-card opponent-trash threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-009", as: "host", under: ["BT2-001"] }] },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give +1000 DP with only 4 cards in the opponent's trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-009", as: "host", under: ["BT2-001"] }] },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-009", as: "host", under: ["BT2-001"] }] },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("survives a legal public hatch, digivolve, and move from breeding", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-001", as: "egg" }],
        hand: [{ card: "BT2-009", as: "host" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        battleArea: [],
      },
      1: {
        deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019", "BT1-020", "BT1-021"],
        trash: ["BT1-022", "BT1-023", "BT1-024", "BT1-025", "BT1-026"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-009");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-001"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-001"]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("only buffs the host carrying Gigimon, not a peer Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-009", as: "host", under: ["BT2-001"] },
          { card: "BT2-009", as: "peer" },
        ],
      },
      1: { trash: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.perm("peer").currentDP).toBe(s.perm("peer").baseDP);
  });
});

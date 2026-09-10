import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT2-003.js";

describe("BT2-003 Nyaromon", () => {
  it("matches the catalog and exact inherited suspended Security DP aura", () => {
    expect(getCardDefinition("BT2-003")).toMatchObject({
      cardId: "BT2-003",
      set: "BT2",
      nameEn: "Nyaromon",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      inheritedEffectText:
        "[Opponent's Turn] While this Digimon is suspended, all of your Security Digimon get +1000 DP.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT2-003",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OpponentsTurn",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Aura",
            effect: { kind: "modifySecurityDP", amount: 1000 },
            while: { kind: "selfIsSuspended" },
          }),
        ],
      }),
    ]);
  });

  it("gives all of its owner's Security Digimon +1000 DP on the opponent's turn while its host is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-034", as: "host", under: ["BT2-003"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(1000);
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });

  it("does not grant Security DP while the host is active", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-034", as: "host", under: ["BT2-003"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("does not grant Security DP during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-034", as: "host", under: ["BT2-003"], suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("stacks the aura from 2 suspended hosts", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-034", under: ["BT2-003"], suspended: true },
          { card: "BT2-034", under: ["BT2-003"], suspended: true },
          { card: "BT2-034", as: "peer", suspended: true },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(2000);
  });

  it("survives a legal public hatch, digivolve, and move before the opponent's turn aura window", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-003", as: "egg" }],
        hand: [{ card: "BT2-034", as: "host" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        security: ["BT1-016"],
      },
      1: { deck: ["BT1-017", "BT1-018", "BT1-019", "BT1-020", "BT1-021", "BT1-022"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-034");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-003"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-003"]);
    expect(observe(s.engine).securityDp(0)).toBe(1000);
    expect(observe(s.engine).securityDp(1)).toBe(0);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

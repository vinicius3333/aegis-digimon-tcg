import { getCardDefinition, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT2-004.js";

async function unsuspendForActivePhase(engine: Parameters<typeof advance>[0], seat: Seat): Promise<string[]> {
  return (engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }).unsuspendForActivePhase(
    seat,
  );
}

describe("BT2-004 Argomon", () => {
  it("matches the catalog and exact inherited unsuspend-phase trigger", () => {
    expect(getCardDefinition("BT2-004")).toMatchObject({
      cardId: "BT2-004",
      set: "BT2",
      nameEn: "Argomon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      inheritedEffectText:
        "[Your Turn] When this Digimon becomes unsuspended during your unsuspend phase, gain 1 memory.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT2-004",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenUnsuspended",
            sourceFilter: { isSelfRef: true },
            fireCondition: { kind: "phaseIs", phase: "Active" },
            actions: [{ kind: "GainMemory", amount: 1 }],
          }),
        ],
      }),
    ]);
  });

  it("gains 1 memory when its host becomes unsuspended in the active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] },
    });
    s.state.phase = Phase.Active;
    s.state.memory = 0;
    await s.ready();
    await unsuspendForActivePhase(s.engine, 0);
    expect(s.state.memory).toBe(1);
  });

  it("Q994 does not gain memory when the host is already active during the active phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"] }] } });
    s.state.phase = Phase.Active;
    s.state.memory = 0;
    await unsuspendForActivePhase(s.engine, 0);
    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when the host unsuspends during the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when its host unsuspends during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    s.state.phase = Phase.Active;
    s.state.memory = 0;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(0);
  });

  it("survives a legal public hatch, digivolve, and move from breeding", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-004", as: "egg" }],
        hand: [{ card: "BT2-043", as: "host" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
      },
      1: { deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019", "BT1-020", "BT1-021"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-043");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-004"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-004"]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

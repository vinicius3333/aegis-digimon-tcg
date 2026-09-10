import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT2-002.js";

describe("BT2-002 DemiVeemon", () => {
  it("matches the catalog and exact once-per-turn inherited trigger", () => {
    expect(getCardDefinition("BT2-002")).toMatchObject({
      cardId: "BT2-002",
      set: "BT2",
      nameEn: "DemiVeemon",
      colors: ["Blue"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When this Digimon becomes unsuspended during your main phase, it gets +1000 DP for the turn.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT2-002",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenUnsuspended",
            sourceFilter: { isSelfRef: true },
            fireCondition: { kind: "phaseIs", phase: "Main" },
            actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000, duration: "forTheTurn" })],
          }),
        ],
      }),
    ]);
  });

  it("gives +1000 DP when its suspended host becomes unsuspended in the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-022", as: "host", under: ["BT2-002"], suspended: true }] },
    });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("Q993 requires a real unsuspend during the main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-022", as: "host", under: ["BT2-002"] }] } });
    s.state.phase = Phase.Main;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not activate when the host really unsuspends outside the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-022", as: "host", under: ["BT2-002"], suspended: true }] },
    });
    s.state.phase = Phase.Active;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("activates only once per turn after multiple real main-phase unsuspends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-022", as: "host", under: ["BT2-002"], suspended: true }] },
    });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);

    s.perm("host").isSuspended = true;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not activate during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-022", as: "host", under: ["BT2-002"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("survives a legal public hatch, digivolve, and move, then triggers only for its host", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-002", as: "egg" }],
        hand: [{ card: "BT2-022", as: "host" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        battleArea: [{ card: "BT2-022", as: "peer" }],
      },
      1: { deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019", "BT1-020", "BT1-021"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-022");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-002"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.ready();
    const hostBase = s.perm("host").baseDP;
    const peerBase = s.perm("peer").baseDP;
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-002"]);
    expect(s.perm("host").currentDP).toBe(hostBase);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId, s.perm("peer").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId, s.perm("peer").permanentId]);
    expect(s.perm("host").currentDP).toBe(hostBase + 1000);
    expect(s.perm("peer").currentDP).toBe(peerBase);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resets its once-per-turn trigger at the next owner turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-022", as: "host", under: ["BT2-002"] }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
      },
      1: { deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019", "BT1-020", "BT1-021"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

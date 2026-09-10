import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-028.js";

describe("BT2-028 AeroVeedramon", () => {
  it("unsuspends a blue Digimon with a blue Tamer in play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-086" },
            { card: "BT2-024", as: "base" },
            { card: "BT2-025", as: "target", suspended: true },
            { card: "BT1-010", as: "wrongColor", suspended: true },
          ],
          hand: [{ card: "BT2-028", as: "evolving" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.perm("wrongColor").isSuspended).toBe(true);
  });

  it("Q1003 can unsuspend itself after digivolving over a suspended blue Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086" }, { card: "BT2-024", as: "base", suspended: true }],
          hand: [{ card: "BT2-028", as: "evolving" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").permanentId);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-028" && !s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("does not unsuspend a blue Digimon without an allied blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-024", as: "base" },
            { card: "BT2-025", as: "target", suspended: true },
          ],
          hand: [{ card: "BT2-028", as: "evolving" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-028");
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("grants Jamming to its host when that Digimon becomes unsuspended in the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-030", as: "host", suspended: true, under: ["BT2-028"] }] },
    });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("Q1004 does not grant Jamming when an already active host is targeted by unsuspend", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-030", as: "host", under: ["BT2-028"] }] } });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("does not grant Jamming when the host unsuspends during the Active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-030", as: "host", suspended: true, under: ["BT2-028"] }] },
    });
    s.state.phase = Phase.Active;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("does not grant Jamming when the host unsuspends during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-030", as: "host", suspended: true, under: ["BT2-028"] }] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("proves a legal blue public stack and inherited Jamming through public intents", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT2-002", as: "egg" }],
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT2-024", as: "unsuspendTarget" },
          ],
          hand: [
            { card: "BT2-022", as: "level3" },
            { card: "BT2-024", as: "level4" },
            { card: "BT2-028", as: "source" },
            { card: "BT2-030", as: "host" },
            { card: "BT2-028", as: "unsuspender" },
          ],
          deck,
        },
        1: {
          deck,
          security: ["BT1-010"],
          battleArea: [{ card: "BT2-030", as: "peer", suspended: true, under: ["BT2-028"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const id = s.state.players[0]!.breeding!.permanentId;
    for (const alias of ["level3", "level4", "source", "host"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: id,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.pendingDecision === undefined && s.perm("egg").topCard.instanceId === s.inst(alias).instanceId,
      );
    }
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual([
      "BT2-002",
      "BT2-022",
      "BT2-024",
      "BT2-028",
    ]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Jamming")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: id })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: id,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("unsuspendTarget").permanentId,
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Jamming")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

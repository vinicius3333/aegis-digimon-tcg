import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-123.js";
import "./P-130.js";

describe("P-123 Ukkomon", () => {
  it("hatches and gains memory when a Digimon moves from breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-123", as: "ukkomon" }],
          breeding: { card: "BT1-009", as: "raised" },
          eggDeck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("raised").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding !== undefined && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding).toBeDefined();
    assertNoLoudGap(s);
  });

  it("Q4236 gains memory even when the optional hatch is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-123", as: "ukkomon" }],
          breeding: { card: "BT1-009", as: "raised" },
          eggDeck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;

    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: s.perm("raised").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
  });

  it("Q4239 triggers when Ukkomon itself moves from breeding", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: "P-123", as: "ukkomon" }, eggDeck: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    s.state.phase = Phase.Breeding;

    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: s.perm("ukkomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("resets its breeding watcher after a real turn cycle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-123", as: "ukkomon" }],
          breeding: { card: "BT1-009", as: "firstRookie" },
          eggDeck: ["BT1-001", "BT1-001"],
          hand: [
            { card: "BT1-009", as: "secondRookie" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("firstRookie").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.players[0]!.breeding !== undefined);
    const egg = s.state.players[0]!.breeding!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: s.inst("secondRookie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding!.topCard.instanceId === s.inst("secondRookie").instanceId);

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    const memoryBeforeSecondMove = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: egg.permanentId })).toEqual({ ok: true });
    await settle(() => s.state.memory === memoryBeforeSecondMove + 1 && s.state.players[0]!.breeding !== undefined);
    expect(s.state.memory).toBe(memoryBeforeSecondMove + 1);
    expect(s.state.players[0]!.breeding).toBeDefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger a second time when another effect moves breeding in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-123", as: "ukkomon" }],
          breeding: { card: "BT1-009", as: "firstRookie" },
          eggDeck: ["BT1-001", "BT1-001"],
          hand: [
            { card: "BT1-009", as: "secondRookie" },
            { card: "P-130", as: "lui" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("firstRookie").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.players[0]!.breeding !== undefined);
    const egg = s.state.players[0]!.breeding!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: s.inst("secondRookie").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding!.topCard.instanceId === s.inst("secondRookie").instanceId);

    const memoryBeforeLui = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lui").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined && s.perm("lui").isSuspended);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.eggDeck).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBeforeLui - 2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

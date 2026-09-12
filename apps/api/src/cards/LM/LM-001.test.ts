import { observe } from "../../engine/testkit/observe.js";
import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-001.js";

// Legal yellow level 3 → yellow/blue level 4 → red/yellow level 5 source stack.
const threeColorBase = { card: "BT8-015", as: "base", under: ["BT1-045", "BT13-040"] };

describe("LM-001 Siriusmon", () => {
  it("blast-digivolves from hand in the counter window without paying the cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-001", as: "siriusmon" }], battleArea: [{ card: "BT1-024", as: "base" }] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    // The waiver is only offered inside the defending seat's §11-3 counter window, so the
    // opponent has to be mid-attack for the intent to be legal at all.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("siriusmon").instanceId,
        permanentId: s.perm("base").permanentId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "LM-001");

    expect(s.perm("base").topCard?.cardId).toBe("LM-001");
    expect(s.state.memory).toBe(3);
  });

  it("deletes an 8000 DP Digimon on play with no digivolution cards to scale with", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-001", as: "siriusmon" }] },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 8000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("siriusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("raises the deletion maximum by 1000 for each color in its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-001", as: "siriusmon" }], battleArea: [threeColorBase] },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 11000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: s.inst("siriusmon").instanceId,
      permanentId: s.perm("base").permanentId,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-045", "BT13-040", "BT8-015"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("leaves a Digimon above the raised maximum alone", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-001", as: "siriusmon" }], battleArea: [threeColorBase] },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 12000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: s.inst("siriusmon").instanceId,
      permanentId: s.perm("base").permanentId,
    });
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("places a Gammamon-in-text card from hand as its own bottom digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "LM-001", as: "siriusmon" },
            { card: "LM-016", as: "gammamon" },
          ],
          battleArea: [{ card: "BT1-024", as: "decoy" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("siriusmon").instanceId });
    await settle(() => s.state.players[0]!.hand.every((card) => card.cardId !== "LM-016"));

    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "LM-001")!;
    expect(host.stack.map((card) => card.cardId)).toEqual(["LM-016"]);
    expect(s.perm("decoy").stack).toHaveLength(0);
  });

  it("leaves the hand untouched when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "LM-001", as: "siriusmon" },
            { card: "LM-016", as: "gammamon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("siriusmon").instanceId });
    await settle(() => s.state.pendingDecision == null);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "LM-016")).toBe(true);
  });

  it("gains one memory the first time another Digimon is deleted each turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-001", as: "siriusmon" },
            { card: "BT1-024", as: "ally", dp: 10000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "first", dp: 3000, suspended: true },
            { card: "BT1-080", as: "second", dp: 3000, suspended: true },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("siriusmon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("first").permanentId },
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1, 2000);
    expect(s.state.memory).toBe(2);

    // A second deletion in the same turn is outside the [Once Per Turn] allowance.
    const memoryAfterFirst = s.state.memory;
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ally").permanentId,
      target: { kind: "permanent", permanentId: s.perm("second").permanentId },
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(memoryAfterFirst);
  });

  it("resets the deletion watcher on the controller's next turn", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-009"],
        security: ["BT1-085", "BT1-085"],
        battleArea: [{ card: "LM-001", as: "siriusmon", dp: 12000 }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [
          { card: "BT1-080", as: "first", dp: 3000, suspended: true },
          { card: "BT1-080", as: "second", dp: 3000, suspended: true },
        ],
        deck: ["BT1-009"],
        hand: ["BT1-010"],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("siriusmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    const firstGain = s.state.memory;
    expect(firstGain).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const nextMemory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("siriusmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(nextMemory + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-001");
    const compiled = runtimeCompiledCard("LM-001");
    expect(definition?.nameEn).toBe("Siriusmon");
    expect(definition?.level).toBe(6);
    expect(definition?.dp).toBe(12000);
    expect(definition?.overflowMemory).toBe(4);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});

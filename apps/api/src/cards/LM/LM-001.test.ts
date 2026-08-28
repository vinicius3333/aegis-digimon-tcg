import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-001.js";

// A three-color digivolution stack: Blue Armadillomon and Yellow Tsukaimon under a Red
// MetalTyrannomon, so digivolving into Siriusmon leaves Blue/Yellow/Red beneath it.
const threeColorBase = { card: "BT1-024", as: "base", under: ["BT1-027", "BT1-045"] };

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

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-027", "BT1-045", "BT1-024"]);
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
    await settle(() => s.state.pendingDecision === null);

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
    await settle(() => s.state.pendingDecision === null);

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
          security: 2,
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

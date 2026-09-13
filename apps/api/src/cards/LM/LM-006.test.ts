import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-006.js";

describe("LM-006 Cthyllamon", () => {
  it("plays itself from the trash for its cost minus the returned Tamer's play cost", async () => {
    const s = setupEngine(
      {
        0: {
          // Kiyoshiro Higashimitarai costs 4, so the printed 11 play cost drops to 7.
          hand: ["BT1-027"],
          battleArea: [{ card: "BT9-086", as: "tamer" }],
          trash: [{ card: "LM-006", as: "cthyllamon" }],
          deck: ["BT1-027"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-027", "BT1-028", "BT1-045", "BT1-047"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();
    const effects = JSON.parse(s.inst("cthyllamon").activatableEffectsJson || "[]") as { effectKey: string }[];

    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("cthyllamon").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("cthyllamon").instanceId,
      ),
    );

    // The Tamer went to the bottom of the deck, and memory paid 11 - 4 = 7.
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT9-086");
    expect(s.state.memory).toBe(0);
    void turn;
  });

  it("trashes the bottom three digivolution cards of one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-006", as: "cthyllamon" }] },
        1: {
          battleArea: [{ card: "BT1-080", as: "stacked", under: ["BT1-027", "BT1-028", "BT1-045", "BT1-047"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cthyllamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("stacked").stack.length === 1, 2000);

    // The bottom three go; the top-most digivolution card stays.
    expect(s.perm("stacked").stack.map((card) => card.cardId)).toEqual(["BT1-047"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-027", "BT1-028", "BT1-045"]);
  });

  it("stops every opposing Digimon with no digivolution cards from attacking", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-006", as: "cthyllamon" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "bareA" },
            { card: "BT2-064", as: "bareB" },
            { card: "BT3-089", as: "stacked", under: ["BT1-027", "BT1-028", "BT1-045", "BT1-047"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cthyllamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("bareA").permanentId, "attack"), 2000);

    expect(observe(s.engine).isRestricted(s.perm("bareA").permanentId, "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("bareB").permanentId, "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("stacked").permanentId, "attack")).toBe(false);
  });

  it("releases a Digimon that gains digivolution cards afterwards, per Q3996", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-006", as: "cthyllamon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "bare" }],
          hand: [{ card: "BT1-015", as: "evolution" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cthyllamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("bare").permanentId, "attack"), 2000);
    expect(observe(s.engine).isRestricted(s.perm("bare").permanentId, "attack")).toBe(true);

    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("bare").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bare").topCard?.cardId === "BT1-015");
    expect(s.perm("bare").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);

    expect(observe(s.engine).isRestricted(s.perm("bare").permanentId, "attack")).toBe(false);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-006");
    const compiled = runtimeCompiledCard("LM-006");
    expect(definition?.nameEn).toBe("Cthyllamon");
    expect(definition?.playCost).toBe(11);
    expect(definition?.colors).toEqual(["Blue", "Purple"]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});

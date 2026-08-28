import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-031.js";
import "../BT15/BT15-068.js";
import "../BT6/BT6-002.js";

describe("BT5-031 MetalGarurumon", () => {
  it("bottom-decks an On Deletion Digimon and trashes its sources when Garurumon is in its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-040", as: "base" }], hand: [{ card: "BT5-031", as: "evolving" }] },
        1: { deck: ["BT1-010"], battleArea: [{ card: "AD1-002", under: [{ card: "BT1-011", as: "source" }] }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0);

    expect(opponent.deck.at(-1)?.cardId).toBe("AD1-002");
    expect(opponent.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("does not fire source-trash inherited effects during return teardown (Q1399)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-040", as: "base" },
            { card: "BT5-020", as: "watcher", under: ["BT6-002"] },
          ],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
          hand: [{ card: "BT5-031", as: "evolving" }],
        },
        1: {
          deck: ["BT1-009"],
          battleArea: [{ card: "AD1-002", as: "target", under: [{ card: "BT1-011", as: "source" }] }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("watcher"));
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("notDrawn").instanceId);
  });

  it("gains 1 memory only once per turn when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-086", as: "host", under: ["BT5-031"] }] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 1);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]?.security.length === 0);
    expect(s.state.memory).toBe(1);
  });

  it("does not bottom-deck when the only Garurumon source is KendoGarurumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base", under: ["BT4-027"] }],
          hand: [{ card: "BT5-031", as: "evolving" }],
        },
        1: { battleArea: [{ card: "AD1-002", as: "target" }] },
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
    await settle(() => s.perm("base").topCard.cardId === "BT5-031");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("targets a Digimon whose On Deletion effect is inherited", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-040", as: "base" }], hand: [{ card: "BT5-031", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", under: ["BT1-010", "BT1-030"] }] },
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
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
  });

  it("targets a Digimon with an On Deletion effect granted by another card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "base" }],
          hand: [
            { card: "BT15-068", as: "gizmo" },
            { card: "BT5-031", as: "evolving" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gizmo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
  });
});

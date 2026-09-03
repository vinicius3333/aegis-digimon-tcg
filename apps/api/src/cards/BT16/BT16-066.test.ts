import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-066.js";
import "../index.js";

describe("BT16-066", () => {
  it("offers the opponent a hand trash and gains memory if they decline", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Trash",
        controller: "opponent",
        chooser: "opponent",
        optional: true,
        target: { filter: { kind: ["Digimon"] } },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "ifThisEffectDidNotAct" },
      });
    }
  });

  it("draws and trashes one card as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", target: { count: 1 } },
      ],
    });
  });

  it("naturally declines the opponent's hand-trash choice and gains memory on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-021", as: "source" }],
          hand: [{ card: "BT16-066", as: "syako" }],
        },
        1: { hand: [{ card: "BT1-009", as: "opponentDigimon" }] },
      },
      { autoDeclineOptional: true },
    );
    // The normal digivolution costs 1; declining then gains that 1 back.
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("syako").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT16-066" && s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponentDigimon").instanceId)).toBe(
      true,
    );
  });

  it("draws and trashes a card through the inherited effect on a natural attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT16-066"] }],
          deck: ["BT1-009"],
          hand: [{ card: "BT1-010", as: "discard" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 1);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});

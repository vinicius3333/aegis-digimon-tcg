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

describe("BT16-066 Syakomon (X Antibody) — KB Q&A rulings", () => {
  it("lets the opponent decide whether to trash and which Digimon card to trash (Q2656)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-021", as: "syakomon" }],
        hand: [{ card: "BT16-066", as: "syakoX" }],
      },
      1: {
        hand: [
          { card: "BT1-009", as: "keptDigimon" },
          { card: "BT1-010", as: "trashedDigimon" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("syakomon").permanentId,
        instanceId: s.inst("syakoX").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const trashChoice = s.state.pendingDecision!;
    expect(trashChoice.seat).toBe(1);
    expect(s.decisions.at(-1)!.req.options).toMatchObject({ min: 0, max: 1 });
    expect(new Set(s.decisions.at(-1)!.req.options?.candidateInstanceIds)).toEqual(
      new Set([s.inst("keptDigimon").instanceId, s.inst("trashedDigimon").instanceId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: trashChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("keptDigimon").instanceId] },
      }).ok,
    ).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: trashChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("trashedDigimon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashedDigimon").instanceId]);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("keptDigimon").instanceId,
      s.inst("tamer").instanceId,
    ]);
    expect(s.state.memory).toBe(1);
  });
});

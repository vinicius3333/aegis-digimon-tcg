import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-014 Penguinmon", () => {
  it("encodes both reveal categories, deck-bottom remainder, alternate evolution, and inherited Jamming", () => {
    const compiled = runtimeCompiledCard("EX11-014")!;

    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Hiyarimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["Suzune Kazuki"], match: "nameExact" }] } },
            {
              count: 1,
              to: "hand",
              filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }] },
            },
          ],
        },
      ],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
    expect(compiled.effects.some((effect) => effect.isSecurity)).toBe(false);
  });

  it("reveals exactly three, adds Suzune plus one Ice-Snow Digimon, and bottoms the rest", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-014", as: "penguinmon" }],
          deck: [
            { card: "EX11-057", as: "suzune" },
            { card: "EX11-015", as: "iceSnow" },
            { card: "BT1-009", as: "remainder" },
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("suzune").instanceId, s.inst("iceSnow").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguinmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("iceSnow").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("suzune").instanceId, s.inst("iceSnow").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("unrevealed").instanceId, s.inst("remainder").instanceId]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("remainder").instanceId);
    assertNoLoudGap(s);
  });

  it("adds at most one card from each category when multiple Ice-Snow Digimon are revealed", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-014", as: "penguinmon" }],
          deck: [
            { card: "EX11-057", as: "suzune" },
            { card: "EX11-015", as: "preferredIce" },
            { card: "BT1-032", as: "otherIce" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("suzune").instanceId, s.inst("preferredIce").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguinmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("preferredIce").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("suzune").instanceId, s.inst("preferredIce").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("otherIce").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("otherIce").instanceId);
    assertNoLoudGap(s);
  });

  it("handles fewer than three deck cards and independently adds only the matching category", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-014", as: "penguinmon" }],
          deck: [
            { card: "EX11-015", as: "iceSnow" },
            { card: "BT1-009", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("penguinmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("iceSnow").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("iceSnow").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("remainder").instanceId]);
    assertNoLoudGap(s);
  });

  it("grants its host Jamming and survives a losing security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-014"] }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not grant Jamming while Penguinmon is the standalone top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-014", as: "penguinmon" }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    const penguinmonId = s.perm("penguinmon").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("penguinmon"), "Jamming")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: penguinmonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === penguinmonId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === penguinmonId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("uses the Hiyarimon cost 0 route, normal blue/yellow cost 1 routes, and rejects red", async () => {
    async function digivolveFrom({
      egg,
      expectedCost,
      useAlternateCost = false,
    }: {
      egg: string;
      expectedCost: number;
      useAlternateCost?: boolean;
    }): Promise<number> {
      const s = setupEngine({
        0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "EX11-014", as: "penguinmon" }] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("penguinmon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("egg").topCard.cardId === "EX11-014");
      expect(s.state.memory).toBe(3 - expectedCost);
      return s.state.memory;
    }

    await digivolveFrom({ egg: "EX11-002", expectedCost: 0, useAlternateCost: true });
    await digivolveFrom({ egg: "BT1-003", expectedCost: 1 });
    await digivolveFrom({ egg: "BT1-005", expectedCost: 1 });

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-001", as: "redEgg" }, hand: [{ card: "EX11-014", as: "penguinmon" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redEgg").permanentId,
        instanceId: invalid.inst("penguinmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

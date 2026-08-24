import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-011 Seasarmon", () => {
  it("deletes one opposing Digimon at 5000 DP or less on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-011", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 5000 },
            { card: "BT1-011", as: "high", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId !== "BT1-010"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-011"]);
  });

  it("deletes one opposing Digimon at 5000 DP or less when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "base" }],
          hand: [{ card: "EX12-011", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 5000 },
            { card: "BT1-011", as: "high", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("base").topCard?.cardId).toBe("EX12-011");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-011"]);
  });

  it("cannot delete a 6000 DP Digimon and leaves the opponent's board intact", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-011", as: "source" }] },
        1: { battleArea: [{ card: "BT1-011", as: "high", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-011"]);
  });

  it("never deletes an own Digimon even when it is within the DP threshold", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-011", as: "source" }],
          battleArea: [{ card: "BT1-010", as: "own", dp: 1000 }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("own").permanentId),
    ).toBe(true);
  });

  it("keeps Raid printed and scopes the inherited +2000 DP to its host on the owner's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-011", as: "printed" },
          { card: "EX12-011", as: "host", under: ["EX12-011"] },
          { card: "EX12-011", as: "other" },
        ],
      },
    });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("printed").permanentId, "Raid")).toBe(true);
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Raid")).toBe(true);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(5000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(5000);

    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);

    const compiled = registeredCompiledCards.get("EX12-011")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Shambala"], cost: 2, isAlternate: true }]);
  });

  it("encodes the same exact delete filter in both timing windows", () => {
    const compiled = registeredCompiledCards.get("EX12-011")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } } },
          },
        ],
      });
    }
  });

  it("digivolves for 2 by the standard red route or the level-3 Shambala alternate", async () => {
    expect(digivolutionRequirementsFor("EX12-011")).toEqual([
      { level: 3, traits: ["Shambala"], cost: 2, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost] of [
      ["EX12-005", false],
      ["EX12-006", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-011", as: "seasarmon" }],
        },
      });
      s.state.memory = 2;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("seasarmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-011");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects alternate evolution over an off-color level-3 card without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "EX12-011", as: "seasarmon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("seasarmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});

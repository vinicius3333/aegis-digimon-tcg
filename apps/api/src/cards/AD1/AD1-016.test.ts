import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-016 ShineGreymon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-016");
    const compiled = registeredCompiledCards.get("AD1-016") ?? getCompiledCard("AD1-016");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-016");
    expect(definition?.nameEn).toBe("ShineGreymon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("plays Marcus Damon for free and applies -3000 DP per own Digimon or Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-042", as: "rize" }],
          hand: [
            { card: "AD1-016", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "scaled-target", dp: 18001 },
            { card: "BT1-010", as: "delete-target", dp: 12000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rize").permanentId,
        instanceId: s.inst("shine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("scaled-target").currentDP === 12001 && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT12-092")).toBe(true);
    expect(s.perm("scaled-target").currentDP).toBe(12001);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("scaled-target").permanentId);
  });

  it("does not delete above ShineGreymon's DP when Marcus is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-016", as: "shine" }], hand: [{ card: "BT12-092", as: "marcus" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "boundary", dp: 12000 },
            { card: "BT1-010", as: "over", dp: 12001 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over").permanentId);
  });

  it("shares one use between its when-digivolving and when-attacking timings", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-042", as: "base" }], hand: [{ card: "AD1-016", as: "shine" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 12000 },
            { card: "BT1-010", as: "second", dp: 12000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.currentDP === 9000));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 9000)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.currentDP === 12000)).toHaveLength(1);
  });

  it("deletes at most one opposing Digimon when Marcus is played or suspended each turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-016", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 5000 },
            { card: "BT1-010", as: "second", dp: 6000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("marcus").permanentId });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("uses either printed alternate level-5 route for cost 3", async () => {
    for (const baseCard of ["BT12-042", "BT25-027"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-016", as: "shine" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("shine").instanceId,
          alternateRequirementIndex: baseCard === "BT12-042" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "AD1-016");
      expect(s.state.memory).toBe(2);
    }
  });

  it("publishes Alliance and Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-016", as: "shine" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("shine").permanentId, "Alliance")).toBe(true);
    expect(continuous.hasKeyword(s.perm("shine").permanentId, "Blocker")).toBe(true);
  });
});

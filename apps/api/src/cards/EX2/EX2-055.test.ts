import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// Behavioral A3 for EX2-055 (Reaper) — BeforePayCost: trash 7+ digivolution cards from the bottom
// of 1 of your [Mother D-Reaper]s to SET this Digimon's play cost to 0 (setCostTo, not reduceCost).
// source: documented behavior. (Previously only an IR-text assertion — this drives the
// real play path.)
//
// FAILS-WHEN-REVERTED: EX2-055 (printed cost 20) enters play without memory being spent (cost set
// to 0) AND the Mother D-Reaper loses 7 digivolution cards. Without the BeforePayCost clause the
// cost-20 play would drain memory.

describe("EX2-055 BeforePayCost: trash 7+ from a Mother D-Reaper's bottom → set play cost to 0", () => {
  it("plays EX2-055 (printed cost 20) for free and removes 7 digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          // Mother D-Reaper with 8 digivolution cards (>= 7 required).
          battleArea: [
            {
              card: "EX2-007",
              dp: 13000,
              as: "mother",
              under: Array.from({ length: 8 }, () => ({ card: "BT1-009", faceUp: false })),
            },
          ],
          hand: [{ card: "EX2-055", as: "reaper" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;

    const mother = s.perm("mother");
    const motherStackBefore = mother.stack.length;
    const reaper = s.inst("reaper");
    s.state.memory = 10; // far below the printed cost 20
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: reaper.instanceId })).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "EX2-055"));

    // EX2-055 entered play despite memory < printed cost — its cost was set to 0.
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "EX2-055")).toBe(true);
    expect(s.state.memory).toBe(memoryBefore); // no memory spent (cost 0)
    // 7 digivolution cards were trashed from the Mother D-Reaper's bottom.
    expect(mother.stack.length).toBe(motherStackBefore - 7);
  });

  it("keeps the Mother stack intact and pays the printed cost when the reduction is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 7 }, () => "BT1-009") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 30;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("reaper").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "EX2-055"));

    expect(s.perm("mother").stack).toHaveLength(7);
    expect(s.state.memory).toBe(10);
  });

  it("lets the player choose to trash more than 7 bottom sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 8 }, () => "EX2-046") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
      },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("reaper").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "EX2-055"));

    expect(s.perm("mother").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(8);
    expect(s.state.memory).toBe(10);
  });

  it("trashes the bottom seven digivolution cards rather than the top seven", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX2-007",
              as: "mother",
              under: [
                { card: "BT1-009", as: "bottom" },
                "BT1-010",
                "BT1-011",
                "BT1-012",
                "BT1-013",
                "BT1-014",
                "BT1-015",
                { card: "BT1-016", as: "top" },
              ],
            },
          ],
          hand: [{ card: "EX2-055", as: "reaper" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reaper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX2-055"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("top").instanceId);
    expect(s.perm("mother").stack.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("places exactly 2 ADR-02 Searchers from trash at the bottom, then unsuspends itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-055", as: "reaper", suspended: false, under: ["BT1-009"] }],
          trash: [
            { card: "EX2-046", as: "firstSearcher" },
            { card: "EX2-046", as: "secondSearcher" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      {
        autoSelectCards: true,
        autoOrderTriggers: true,
        autoOrderCards: false,
      },
    );
    await s.ready();
    const firstId = s.inst("firstSearcher").instanceId;
    const secondId = s.inst("secondSearcher").instanceId;
    const originalSourceId = s.perm("reaper").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reaper").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.decisions.at(-1)!.req;
    expect(optional.sourceCardId).toBe("EX2-055");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    const stackOrder = [secondId, firstId];
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: firstId, cardId: "EX2-046" },
      { instanceId: secondId, cardId: "EX2-046" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: stackOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reaper").stack.length === 3 && !s.perm("reaper").isSuspended);

    expect(s.perm("reaper").stack.map((card) => card.instanceId)).toEqual([...stackOrder, originalSourceId]);
    expect(s.perm("reaper").stack.at(-1)?.instanceId).toBe(originalSourceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("reaper").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX2-055")).toHaveLength(1);
  });

  it("has Rush and can attack on the same turn after its free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 7 }, () => "EX2-046") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reaper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("reaper").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("reaper"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reaper").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
  });

  it("does not set its cost to 0 with only six Mother D-Reaper sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: Array.from({ length: 6 }, () => "EX2-046") }],
          hand: [{ card: "EX2-055", as: "reaper" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 30;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reaper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("reaper").instanceId),
    );
    expect(s.state.memory).toBe(10);
    expect(s.perm("mother").stack).toHaveLength(6);
  });

  it("does not unsuspend or place cards when fewer than two Searchers are in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-055", as: "reaper", under: ["BT1-009"] }],
          trash: [{ card: "EX2-046", as: "onlySearcher" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reaper").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("reaper").isSuspended).toBe(true);
    expect(s.perm("reaper").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("onlySearcher").instanceId);
  });
});

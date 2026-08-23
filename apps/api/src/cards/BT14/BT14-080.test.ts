import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-080.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-080", () => {
  it("once per turn trashes the opponent's deck based on own trash count on digivolution or attack", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(
        compiled.effects?.find((entry) => entry.trigger === trigger && entry.actions[0]?.kind === "TrashTopDeck"),
      ).toMatchObject({
        frequency: "OncePerTurn",
        actions: [{ kind: "TrashTopDeck", controller: "opponent", amount: 3, scaling: { per: 10, unit: "trash" } }],
      });
  });
  it("once per turn gains Security Attack +1 when the opponent has ten cards in trash", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && entry.actions[0]?.kind === "GainKeyword"),
    ).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          condition: { kind: "zoneCount", value: 10 },
        },
      ],
    }));
  it("trashes three opposing deck cards and grants Security Attack +1 at the ten-card thresholds", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-080", as: "source" }], trash: Array(10).fill("BT1-001") },
        1: { deck: ["BT1-002", "BT1-003", "BT1-004", "BT1-005"], trash: Array(10).fill("BT1-006") },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.length >= 13 &&
        observe(s.engine).keywordAmount(s.perm("source"), "SecurityAttack") === 1,
    );
    expect(s.state.players[1]!.trash.length).toBeGreaterThanOrEqual(13);
    expect(observe(s.engine).keywordAmount(s.perm("source"), "SecurityAttack")).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-051.js";

describe("BT23-051 Golemon", () => {
  it("deletes one 4000-DP opponent when suspended and respects its once-per-turn limit", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-051", as: "gole" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstLow", dp: 4000 },
            { card: "BT1-010", as: "secondLow", dp: 4000 },
            { card: "BT1-019", as: "high", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const firstLowId = s.perm("firstLow").permanentId;
    const secondLowId = s.perm("secondLow").permanentId;

    await advance(s.engine).verb.suspend([s.perm("gole").permanentId]);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === firstLowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondLowId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-019")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("gole").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("gole").permanentId]);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondLowId)).toBe(true);
  });

  it("can attack the opponent player but not an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-051", as: "gole" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gole").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gole").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("declares Alliance and Blocker", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Alliance", "Blocker"]);
  });

  it("once per turn deletes one opposing Digimon at 4000 DP or less when this Golemon suspends", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("cannot attack opponent Digimon during your turn", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Restrict",
      restriction: "cantAttackDigimon",
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });
});

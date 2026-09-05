import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX4 inherited Alliance suspension watchers", () => {
  it("fires EX4-032/033/034 only for Alliance and applies each local -2 digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX4-029", as: "antylamon" },
            { card: "EX4-036", as: "blackrapidmon" },
            { card: "EX4-029", as: "antylamon2" },
          ],
          battleArea: [
            { card: "EX4-031", as: "attacker" },
            { card: "BT15-012", as: "host32", under: ["EX4-032"] },
            { card: "BT15-012", as: "host33", under: ["EX4-033"] },
            { card: "BT15-012", as: "host34", under: ["EX4-034"] },
            { card: "AD1-001", dp: 3000, as: "ally" },
          ],
        },
        1: {
          battleArea: [{ card: "AD1-001", suspended: true, as: "defender" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    await (s.engine as unknown as { recomputeContinuousEffects: () => Promise<void> }).recomputeContinuousEffects();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });

    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision, 5000);
    expect(
      s.engine.applyIntent(0, {
        type: "respondAlliance",
        allyPermanentId: s.perm("ally").permanentId,
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.perm("host32").topCard?.cardId === "EX4-029" &&
        s.perm("host33").topCard?.cardId === "EX4-036" &&
        s.perm("host34").topCard?.cardId === "EX4-029",
      5000,
    );
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("host32").topCard?.cardId).toBe("EX4-029");
    expect(s.perm("host33").topCard?.cardId).toBe("EX4-036");
    expect(s.perm("host34").topCard?.cardId).toBe("EX4-029");
    expect(s.state.memory).toBe(0);
  });

  it("does not fire from an unrelated effect suspension", async () => {
    const s = setupEngine({
      0: {
        hand: ["EX4-029"],
        battleArea: [
          { card: "BT15-012", as: "host", under: ["EX4-032"] },
          { card: "AD1-001", as: "ally" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId], 0);
    await settle(() => false, 20);

    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.perm("host").topCard?.cardId).toBe("BT15-012");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX4-029")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-046.js";
import "../index.js";

describe("BT16-046", () => {
  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("suspends two opposing Digimon or Tamers, restricts them, and deletes a Tamer", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "SelectBind",
        target: { count: 2, bindAs: "effectSuspended", filter: { unsuspended: true } },
      });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Suspend", target: { fromSelectionRef: "effectSuspended" } });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "Restrict",
        target: { fromSelectionRef: "effectSuspended" },
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
      });
      expect(effect.actions?.[3]).toMatchObject({
        kind: "Delete",
        target: { filter: { kind: ["Tamer"], suspended: true } },
      });
    }
  });

  it("gives your Digimon Security Attack +1 when it suspends", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" }],
        },
      ],
    });
  });

  it("restricts only the two Digimon-or-Tamer cards it suspended", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-046", as: "gran" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentDigimon" },
            { card: "BT16-085", as: "opponentTamer" },
            { card: "BT1-009", as: "alreadySuspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gran").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-085"));

    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("alreadySuspended"), "unsuspend")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-085")).toBe(false);
  });
});

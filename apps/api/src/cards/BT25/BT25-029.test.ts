import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_029 } from "./BT25-029.js";
import "../index.js";

describe("BT25-029 MirageGaogamon", () => {
  it("shares the Once Per Turn return sequence and requires one bottom face-down Tamer card", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_029.effects?.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        to: "hand",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
          count: 1,
        },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Return",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
      });
    }
  });

  it("naturally pays the mandatory follow-up cost after a digivolution return sequence", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-027", as: "base", suspended: true },
            { card: "BT25-087", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] },
          ],
          hand: [{ card: "BT25-029", as: "mirage" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget" },
            { card: "BT1-009", as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "BT25-029" &&
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("firstTarget").instanceId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("secondTarget").instanceId),
    );

    expect(s.state.players[1]!.hand).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: s.inst("firstTarget").instanceId }),
        expect.objectContaining({ instanceId: s.inst("secondTarget").instanceId }),
      ]),
    );
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toContainEqual(expect.objectContaining({ instanceId: s.inst("cost").instanceId }));
    expect(s.state.memory).toBe(0);
  });

  it("does not pay the processing cost when the follow-up is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-027", as: "base", suspended: true },
            { card: "BT25-087", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] },
          ],
          hand: [{ card: "BT25-029", as: "mirage" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget" },
            { card: "BT1-009", as: "secondTarget" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mirage").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("base").topCard.cardId === "BT25-029" && s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ topCard: expect.objectContaining({ instanceId: s.inst("firstTarget").instanceId }) }),
        expect.objectContaining({ topCard: expect.objectContaining({ instanceId: s.inst("secondTarget").instanceId }) }),
      ]),
    );
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("cost").instanceId }),
    );
  });

  it("keeps both All Turns unsuspend watchers once per turn", () => {
    const effect = BT25_029.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", optional: true }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          optional: true,
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
        }),
      ]),
    );
  });
});

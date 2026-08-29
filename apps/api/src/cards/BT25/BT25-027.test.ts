import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled as BT25_027 } from "./BT25-027.js";
import "../index.js";

describe("BT25-027 MachGaogamon", () => {
  it("shares the Once Per Turn return-and-unsuspend sequence", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_027.effects?.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        to: "hand",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Unsuspend",
        abortOnDecline: true,
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
      });
      expect(effect?.actions?.[1]).not.toHaveProperty("optional");
    }
  });

  it("naturally pays the mandatory follow-up cost after a digivolution return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-023", as: "base", suspended: true },
            { card: "BT25-087", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] },
          ],
          hand: [{ card: "BT25-027", as: "mach" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mach").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "BT25-027" &&
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.players[1]!.hand).toContainEqual(expect.objectContaining({ instanceId: s.inst("target").instanceId }));
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toContainEqual(expect.objectContaining({ instanceId: s.inst("cost").instanceId }));
    expect(s.state.memory).toBe(0);
  });

  it("protects the source and the inherited Gaogamon/DATA SQUAD target", () => {
    const main = BT25_027.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(main?.frequency).toBe("OncePerTurn");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      sourceFilter: { isSelfRef: true },
      cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
    });
    const inherited = BT25_027.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      sourceFilter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Gaogamon"], match: "name" },
          { tokens: ["DATA SQUAD"], match: "trait" },
        ],
      },
      cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
    });
  });
});

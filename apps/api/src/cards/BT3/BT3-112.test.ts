import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT3-112.js";

describe("BT3-112 Omnimon Alter-S", () => {
  it("matches official metadata and publishes both effects without ghost actions", () => {
    expect(module.cardId).toBe("BT3-112");
    expect(getCardDefinition("BT3-112")).toMatchObject({
      nameEn: "Omnimon Alter-S",
      colors: ["White"],
      level: 7,
      effectText: expect.stringContaining("De-Digivolve 1"),
    });
    expect(getCompiledCard("BT3-112")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [{ kind: "DeDigivolve" }, { kind: "Delete" }],
        },
        {
          trigger: "WhenAttacking",
          actions: [{ kind: "Restrict", restriction: "cantBeBlocked", optional: true }],
        },
      ],
    });
  });

  it("De-Digivolves all opponents then deletes those with 5000 DP or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-074", as: "base" }],
          hand: [{ card: "BT3-112", as: "alterS" }],
        },
        1: {
          battleArea: [
            { card: "BT2-020", as: "deleted", under: ["BT1-019"] },
            { card: "BT2-083", as: "survivor", under: ["BT2-020"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const deletedId = s.perm("deleted").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alterS").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === deletedId), 5000);

    expect(s.perm("survivor").topCard.cardId).toBe("BT2-020");
  });

  it("may return a level 6 source to hand to become unblockable for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-112", as: "alterS", under: [{ card: "BT3-074", as: "levelSix" }] }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const returnedId = s.inst("levelSix").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alterS").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === returnedId) &&
        observe(s.engine).isRestricted(s.perm("alterS"), "cantBeBlocked"),
      5000,
    );

    expect(s.perm("alterS").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("alterS"), "cantBeBlocked")).toBe(true);
  });
});

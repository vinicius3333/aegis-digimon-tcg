import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT25-048.js";

describe("BT25-048 Bearmon", () => {
  it("reduces a battle-area TS digivolution by 1 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-050", as: "target" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT25-050");

    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a non-TS or breeding-area digivolution", async () => {
    const nonTs = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-049", as: "target" }] },
    });
    nonTs.state.memory = 2;
    await nonTs.ready();
    expect(
      nonTs.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonTs.perm("source").permanentId,
        instanceId: nonTs.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonTs.perm("source").topCard?.cardId === "BT25-049");
    expect(nonTs.state.memory).toBe(0);

    const breeding = setupEngine({
      0: { breeding: { card: "BT25-048", as: "source" }, hand: [{ card: "BT25-050", as: "target" }] },
    });
    breeding.state.memory = 2;
    await breeding.ready();
    expect(
      breeding.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breeding.perm("source").permanentId,
        instanceId: breeding.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => breeding.state.players[0]!.breeding?.topCard?.cardId === "BT25-050");
    expect(breeding.state.memory).toBe(0);

    const nonGreenTs = setupEngine({
      0: { battleArea: [{ card: "BT25-048", as: "source" }], hand: [{ card: "BT25-013", as: "target" }] },
    });
    nonGreenTs.state.memory = 3;
    await nonGreenTs.ready();
    expect(
      nonGreenTs.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nonGreenTs.perm("source").permanentId,
        instanceId: nonGreenTs.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => nonGreenTs.perm("source").topCard?.cardId === "BT25-013");
    expect(nonGreenTs.state.memory).toBe(1);
  });

  it("draws once when the inherited Bearmon wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"] }], hand: [], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-009", as: "loser", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("loser").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT1-001");
  });

  it("draws naturally when the inherited Bearmon wins a security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-050", as: "winner", under: ["BT25-048"], dp: 12000 }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("records the alternate evolution requirement and inherited timing", () => {
    expect(digivolutionRequirementsFor("BT25-048")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });
  });
});

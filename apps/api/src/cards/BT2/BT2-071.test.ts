import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-071.js";

describe("BT2-071 Wizardmon", () => {
  it("gains Retaliation while its controller has a yellow Digimon in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-071", as: "wizardmon" },
          { card: "BT2-034", as: "yellowAlly" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("wizardmon"), "Retaliation")).toBe(true);
  });

  it("does not gain Retaliation from an opponent's yellow Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-071", as: "wizardmon" }] },
      1: { battleArea: [{ card: "BT2-034", as: "opponentYellow" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("wizardmon"), "Retaliation")).toBe(false);
  });

  it("loses Retaliation after its controller no longer has a yellow Digimon in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-071", as: "wizardmon" },
          { card: "BT2-034", as: "yellowAlly" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("wizardmon"), "Retaliation")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("yellowAlly").permanentId]);

    expect(observe(s.engine).hasKeyword(s.perm("wizardmon"), "Retaliation")).toBe(false);
  });

  it("uses Retaliation after losing a battle and draws 1 from On Deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-071", as: "wizardmon" },
          { card: "BT2-034", as: "yellowAlly" },
        ],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-084", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    const wizardmonId = s.perm("wizardmon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: wizardmonId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === wizardmonId) &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[0]!.hand.length === 1,
    );

    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-071")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-084")).toBe(true);
  });
});

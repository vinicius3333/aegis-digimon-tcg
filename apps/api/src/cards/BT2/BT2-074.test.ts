import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-074.js";

describe("BT2-074 Devimon", () => {
  it("has printed Retaliation and deletes the Digimon it loses a battle against", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-074", as: "devimon" }] },
      1: { battleArea: [{ card: "BT1-084", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("devimon"), "Retaliation")).toBe(true);
    const devimonId = s.perm("devimon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: devimonId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-074")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-084")).toBe(true);
  });

  it("grants inherited Retaliation to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-075", as: "host", under: ["BT2-074"] }] },
      1: { battleArea: [{ card: "BT1-084", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-084")).toBe(true);
  });

  it("does not retaliate when deleted by an effect instead of after losing a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-074", as: "devimon" }] },
      1: { battleArea: [{ card: "BT1-084", as: "opponent" }] },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("devimon").permanentId]);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("opponent").permanentId);
  });
});

import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-065.js";

describe("EX4-065 Trident Gaia", () => {
  it("deletes the highest-DP opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", superlative: "highestDP" } } });
  });
  it("trashes the opponent's top security after a 13000-DP own Digimon deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { dp: { op: "gte", value: 13000 } }, actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.isSecurity).toBe(true);
  });

  it("deletes the highest-DP Digimon and trashes security at 13000 DP", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX4-065", as: "option" }] },
      1: { security: ["BT1-001", "BT1-001"], battleArea: [{ card: "BT1-011", as: "highest", dp: 13000 }, { card: "BT1-009", as: "lower", dp: 12000 }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT1-011"));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("highest").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

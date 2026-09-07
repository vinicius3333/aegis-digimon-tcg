import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("Save source identity", () => {
  it("places the deleted instance under a Tamer without relocating an identical surviving Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-011", as: "deleted", suspended: true },
            { card: "BT21-011", as: "survivor", under: ["BT21-001"] },
            { card: "BT21-083", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deletedId = s.inst("deleted").instanceId;
    const survivorId = s.perm("survivor").permanentId;
    const survivorStack = s.perm("survivor").stack.map((card) => card.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("deleted").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([deletedId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === survivorId)).toBe(true);
    expect(s.perm("survivor").topCard.instanceId).toBe(s.inst("survivor").instanceId);
    expect(s.perm("survivor").stack.map((card) => card.instanceId)).toEqual(survivorStack);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === deletedId)).toBe(false);
  });

  it("keeps a saved source under the selected Tamer across the independent Save continuation", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-016", as: "deleted", suspended: true, under: ["BT21-011"] },
            { card: "BT21-083", as: "tamerA" },
            { card: "BT21-083", as: "tamerB" },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const deletedId = s.inst("deleted").instanceId;
    const tamerAId = s.perm("tamerA").permanentId;
    const tamerBId = s.perm("tamerB").permanentId;
    preferred.push(deletedId, tamerAId, tamerBId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("deleted").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.pendingDecision).toBeUndefined();

    const tamerA = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === tamerAId);
    const tamerB = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === tamerBId);
    expect(tamerA).toBeDefined();
    expect(tamerB).toBeDefined();
    expect(tamerA!.stack.map((card) => card.instanceId)).toEqual([deletedId]);
    expect(tamerB!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === deletedId)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-056.js";

describe("EX8-056", () => {
  it("draws 1 then trashes 1 card on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "Trash", target: { count: 1 } },
    ]));
  it("inherits a once-per-turn attack deletion of an opposing level 3 Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } } }],
    }));
  it("draws then trashes exactly one hand card when deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-056", as: "source" }], hand: [{ card: "BT1-010", as: "filler" }], deck: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => player.trash.some((card) => card.instanceId === s.inst("filler").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
    expect(player.trash).toHaveLength(2);
  });
  it("deletes a real opposing level 3 Digimon when the inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-056"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "victim", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-016")).toBe(true);
  });
});

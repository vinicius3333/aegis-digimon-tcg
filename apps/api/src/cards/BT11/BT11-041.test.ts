import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-041.js";

describe("BT11-041 Etemon", () => {
  it("trashes a Sukamon from hand to give -3000 DP and Security Attack -1", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-041", as: "etemon" },
          { card: "BT11-040", as: "cost" },
        ],
      },
      1: { battleArea: [{ card: "ST15-11", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("etemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("can delete an opponent's Sukamon to prevent its host's deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-040", as: "host", under: ["BT11-041"] }] },
      1: { battleArea: [{ card: "BT11-040", as: "opponentSukamon" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

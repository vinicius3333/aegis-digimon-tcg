import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-026.js";

describe("LM-026 Megidramon", () => {
  it("deletes only opposing Digimon at 11000 DP or less", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "LM-026", as: "megidramon" }] },
      1: { battleArea: [{ card: "BT1-081", as: "low" }, { card: "BT1-082", as: "high" }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megidramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-082")).toBe(true);
  });

  it("replaces its own leave with a Guilmon host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-026", as: "megidramon", under: ["BT4-009"] }], trash: ["BT2-009"] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT2-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT2-009")!.stack.map((card) => card.cardId)).toEqual(["LM-026", "BT4-009"]);
  });
});

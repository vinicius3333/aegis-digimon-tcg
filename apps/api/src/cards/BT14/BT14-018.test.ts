import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-018.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-018", () => {
  it("plays one Amon or Umon token on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "PlayToken", count: 1, payCost: false });
  });
  it("deletes its tokens instead of leaving or digivolving and gains Recovery +1 when a token is deleted", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldLeavePlay" }, { kind: "Replacement", event: "wouldDigivolve" }, { kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "GainKeyword", keyword: { keyword: "Recovery" } }] }] }));
  it("plays both distinct token variants on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-018", as: "source" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => {
      const ids = s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId);
      return ids.includes("TOKEN-Amon-Token") && ids.includes("TOKEN-Umon-Token");
    });
    const ids = s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId);
    expect(ids).toContain("TOKEN-Amon-Token");
    expect(ids).toContain("TOKEN-Umon-Token");
  });
});

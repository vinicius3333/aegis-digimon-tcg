import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-032 Airdramon", () => {
  it("On Deletion gives one opponent Security Attack -1 and recovers at exactly 2 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-032", as: "air" }],
        security: ["BT19-029", "BT19-030"], deck: ["BT19-031"],
      },
      1: { battleArea: [{ card: "BT19-020", as: "first" }, { card: "BT19-021", as: "second" }] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("air").permanentId], "byEffect");
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT19-031");
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not recover above the 2-security threshold but still applies the preceding reduction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-032", as: "air" }],
        security: ["BT19-029", "BT19-030", "BT19-031"], deck: ["BT19-033"],
      },
      1: { battleArea: [{ card: "BT19-020", as: "target" }] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("air").permanentId], "byEffect");
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT19-033"]);
  });

  it("inherited Barrier trashes top security to prevent an opponent-effect leave", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-037", as: "host", under: ["BT19-032"] }],
      security: ["BT19-029", "BT19-030"],
    } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({ ok: true });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT19-030"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-029");
  });
});

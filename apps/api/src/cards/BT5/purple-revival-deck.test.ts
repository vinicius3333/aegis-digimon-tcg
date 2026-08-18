import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-087.js";
import "../BT13/BT13-080.js";
import "./BT5-106.js";

describe("BT4-BT5 purple revival package", () => {
  it("separates Anubismon's Rush play from Demonic Disaster's On Play-suppressed revival", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-012", as: "base" }],
        hand: [{ card: "BT4-087", as: "anubismon" }],
        security: [{ card: "BT5-106", as: "disaster", faceUp: true }],
        trash: [
          { card: "BT13-080", as: "firstRevival" },
          { card: "BT13-080", as: "secondRevival" },
        ],
        deck: ["BT5-071", "BT5-072", "BT5-073", "BT5-074", "BT5-075"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("firstRevival").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("anubismon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => {
      const permanent = s.state.players[0]!.battleArea.find(
        (candidate) => candidate.topCard.instanceId === s.inst("firstRevival").instanceId,
      );
      return permanent !== undefined && observe(s.engine).hasKeyword(permanent, "Rush") && s.state.players[0]!.deck.length < 5;
    });
    const first = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("firstRevival").instanceId,
    )!;
    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(true);
    const afterNormalOnPlay = s.state.players[0]!.deck.length;
    expect(afterNormalOnPlay).toBeLessThan(5);

    preferred.splice(0, preferred.length, s.inst("secondRevival").instanceId);
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("disaster"));

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("secondRevival").instanceId,
    )).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(afterNormalOnPlay);
  });
});

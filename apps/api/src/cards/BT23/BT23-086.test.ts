import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-086.js";

function fireTiming(s: EngineSetup, timing: EffectTiming, subjectPermanentId: string): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, { subjectPermanentId });
}

describe("BT23-086 Yuugo", () => {
  it("pays the security cost and places only a Zaxon Digimon from hand face up at security bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-086", as: "yuugo" }],
          hand: [
            { card: "BT23-015", as: "zaxon" },
            { card: "BT1-009", as: "plain" },
          ],
          security: [{ card: "BT1-010", as: "securityTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const zaxonId = s.inst("zaxon").instanceId;
    const plainId = s.inst("plain").instanceId;
    const paidSecurityId = s.inst("securityTop").instanceId;

    await fireTiming(s, EffectTiming.OnPlay, s.perm("yuugo").permanentId);

    const player = s.state.players[0]!;
    expect(player.hand.some((card) => card.instanceId === paidSecurityId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === plainId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === zaxonId)).toBe(false);
    expect(player.security).toHaveLength(1);
    expect(player.security[0]).toMatchObject({ instanceId: zaxonId, faceUp: true });
  });

  it("sets memory to 3 when the controller has 2 or less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });
  });

  it("pays by adding the top security card, then places a Zaxon Digimon face-up at the bottom", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["hand", "trash"],
      toTop: false,
      faceUp: true,
      cost: { kind: "securityToHand" },
      optional: true,
      abortOnDecline: true,
    });
    expect(effect.actions[0].source.filter.nameOrTrait).toEqual([{ tokens: ["Zaxon"], match: "trait" }]);
  });

  it("lets a level 6 Machine or Zaxon Digimon attack a player after suspending this Tamer", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      optional: true,
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
    expect(effect.actions[0].target.filter.levels).toEqual([6]);
  });
});

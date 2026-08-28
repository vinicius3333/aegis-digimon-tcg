import { EffectTiming, getCardDefinition } from "@aegis/shared";
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
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-086")).toMatchObject({
      cardId: "BT23-086",
      nameEn: "Yuugo",
      colors: ["Black", "Red"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["Zaxon", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("sets memory to 3 at 2 or less and leaves higher memory unchanged", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT23-086", as: "yuugo" }] } });
    low.state.memory = 2;
    await fireTiming(low, EffectTiming.OnStartTurn, low.perm("yuugo").permanentId);
    expect(low.state.memory).toBe(3);
    const high = setupEngine({ 0: { battleArea: [{ card: "BT23-086", as: "yuugo" }] } });
    high.state.memory = 4;
    await fireTiming(high, EffectTiming.OnStartTurn, high.perm("yuugo").permanentId);
    expect(high.state.memory).toBe(4);
  });

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

  it("can source the face-up bottom-security Zaxon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-086", as: "yuugo" }],
          trash: [{ card: "BT23-015", as: "zaxon" }],
          security: [{ card: "BT1-010", as: "securityTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const zaxonId = s.inst("zaxon").instanceId;
    await fireTiming(s, EffectTiming.OnPlay, s.perm("yuugo").permanentId);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: zaxonId, faceUp: true });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === zaxonId)).toBe(false);
  });

  it("at end turn suspends Yuugo and makes an eligible level 6 attack the player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-086", as: "yuugo" },
            { card: "BT23-060", as: "machine" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await fireTiming(s, EffectTiming.OnEndTurn, s.perm("yuugo").permanentId);
    expect(s.perm("yuugo").isSuspended).toBe(true);
    expect(s.perm("machine").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
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

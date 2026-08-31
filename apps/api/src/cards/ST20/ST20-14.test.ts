import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST20-14.js";

describe("ST20-14 Our Courage United", () => {
  it("draws two cards and places itself in the battle area through its public Main effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-004", as: "blackDigimon" }],
        hand: [{ card: "ST20-14", as: "option" }],
        deck: [
          { card: "BT1-001", as: "drawnOne" },
          { card: "BT1-002", as: "drawnTwo" },
        ],
      },
    });
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    const option = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === optionId)!.topCard;
    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, option);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnTwo").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawnOne").instanceId, s.inst("drawnTwo").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(true);
  });

  it("places itself in the battle area when revealed from Security without activating Main", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "ST20-14", as: "securityOption", faceUp: true }],
        deck: [{ card: "BT1-001", as: "untouched" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("securityOption").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("securityOption").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: s.inst("untouched").instanceId }),
    );
    expect(s.state.memory).toBe(0);
  });

  it("arms Delay when one of your level-5-or-higher Digimon would leave play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST20-11", as: "level5" }],
        hand: [
          { card: "ST20-14", as: "option" },
          { card: "ST20-02", as: "target" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.placeOptionAsPermanent(s.inst("option").instanceId);
    const option = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("option").instanceId)!;
    expect(observe(s.engine).activatableEffects(option)).toHaveLength(0);
    // Drive the same production leave-event bus used by deletion/bounce while
    // retaining the source Digimon long enough to observe the armed Delay.
    await advance(s.engine).fireSubTrigger("whenLeavesPlay", {
      deletedPermanentId: s.perm("level5").permanentId,
      deletedControllerSeat: 0,
    });
    s.state.turnCount += 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).activatableEffects(option)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: expect.stringMatching(/Delay/i),
        }),
      ]),
    );
  });
});

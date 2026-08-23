import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-095.js";

describe("BT12-095 handwritten module", () => {
  it("keeps the DP and Blocker clauses on the same selected Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-095", as: "tai" },
            { card: "BT12-034", as: "first" },
            { card: "BT12-034", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstBefore = s.perm("first").currentDP;
    const secondBefore = s.perm("second").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tai"));
    await settle(() => s.perm("first").currentDP !== firstBefore || s.perm("second").currentDP !== secondBefore);
    const firstChanged = s.perm("first").currentDP === firstBefore + 1000;
    const secondChanged = s.perm("second").currentDP === secondBefore + 1000;
    expect(firstChanged !== secondChanged).toBe(true);
    const selected = firstChanged ? s.perm("first") : s.perm("second");
    expect(observe(s.engine).hasKeyword(selected, "Blocker")).toBe(true);
  });

  it("registers its printed OnPlay effect without declarative effect record", () => {
    const module = getEffectModule("BT12-095");
    expect(module?.cardId).toBe("BT12-095");
    const source = {
      instanceId: "source-095",
      cardId: "BT12-095",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source).length).toBeGreaterThan(0);
  });

  it("gives an Agumon or Greymon +1000 DP and Blocker at the start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-095", as: "tai" },
            { card: "BT12-034", as: "agumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("agumon").currentDP;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tai"));
    expect(s.perm("agumon").currentDP).toBe(before + 1000);
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Blocker")).toBe(true);
  });

  it("applies the same +1000 DP and Blocker effect when Tai is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-034", as: "agumon" }], hand: [{ card: "BT12-095", as: "tai" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("agumon").currentDP;

    await advance(s.engine).verb.playInstances([s.inst("tai").instanceId]);

    expect(s.perm("agumon").currentDP).toBe(before + 1000);
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Blocker")).toBe(true);
  });

  it("plays Tai from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-095", as: "tai", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tai"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-095")).toBe(true);
  });
});

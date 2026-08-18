import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

function fireTiming(s: ReturnType<typeof setupEngine>, timing: EffectTiming, permanent: string) {
  return advance(s.engine).fire(timing, s.perm(permanent));
}

describe("BT19-001 through BT19-020 card-by-card audit", () => {
  it("BT19-001 places only a trait Digimon from hand, not a trait Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-007", as: "host", under: ["BT19-001"] },
          { card: "BT19-081", as: "tamer" },
        ],
        hand: ["BT19-081", "BT19-016"],
        deck: ["BT1-001"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const handBefore = (s.state.players[0] as PlayerState).hand.length;
    await fireTiming(s, EffectTiming.OnUseAttack, "host");
    await settle(() => (s.state.players[0] as PlayerState).hand.length < handBefore);
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT19-016")).toBe(true);
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT19-081")).toBe(false);
  });

  it("BT19-006 returns a level 3 purple Digimon for effect deletion but not battle deletion", async () => {
    const s = setupEngine({
        0: { battleArea: [{ card: "BT19-006", as: "egg" }], trash: ["BT10-071"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.OnDestroyedAnyone, s.perm("egg"), { removalCause: "byEffect" });
    expect((s.state.players[0] as PlayerState).hand[0]?.cardId).toBe("BT10-071");

    const b = setupEngine({
      0: { battleArea: [{ card: "BT19-006", as: "egg" }], trash: ["BT10-071"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(b.engine).fireForPermanent(EffectTiming.OnDestroyedAnyone, b.perm("egg"), { removalCause: "byBattle" });
    await settle(() => false, 20);
    expect((b.state.players[0] as PlayerState).hand).toHaveLength(0);
  });

  it("BT19-007 recognizes Takato as a Tamer for its memory effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-007", as: "guilmon" }, { card: "BT19-080" }] } });
    s.state.memory = 0;
    await fireTiming(s, EffectTiming.OnStartMainPhase, "guilmon");
    expect(s.state.memory).toBe(1);
  });

  it("BT19-008 digivolves into OmniShoutmon without paying the digivolution cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-008", as: "shout" }, { card: "BT19-081", as: "tamer" }], hand: ["BT19-012"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    const compiled = runtimeCompiledCard("BT19-008");
    const digivolve = compiled?.effects.find((effect) => effect.trigger === "OnPlay")?.actions[0];
    expect(digivolve?.kind).toBe("Digivolve");
    expect((digivolve as { payCost?: boolean }).payCost).toBe(false);
  });

  it("BT19-013 plays a qualifying Xros Heart card from under a Tamer on deletion", async () => {
    const compiled = runtimeCompiledCard("BT19-013");
    const deletionPlay = compiled?.effects.find((effect) => effect.trigger === "OnDeletion")?.actions[0];
    expect(deletionPlay?.kind).toBe("PlayWithoutCost");
    expect((deletionPlay as { from?: string[] }).from).toEqual(["underTamers"]);
    expect((deletionPlay as { target: { filter: { zone?: string } } }).target.filter.zone).toBe("underTamers");
  });

  it("BT19-014 counts distinct colors in its own digivolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-014", as: "ex6", dp: 12000, under: ["BT19-012", "BT19-020"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
    }, { autoSelectCards: true });
    await fireTiming(s, EffectTiming.OnPlay, "ex6");
    expect(s.perm("target").currentDP).toBe(8000);
  });

  it("BT19-020 saves itself even when its conditional Tamer play is unavailable", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-020", as: "greymon" }, { card: "BT19-081", as: "tamer" }] },
    }, { autoDeclineOptional: true });
    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId]);
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT19-020"));
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT19-020")).toBe(true);
  });
});

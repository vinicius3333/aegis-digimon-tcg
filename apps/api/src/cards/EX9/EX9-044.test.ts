import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-044.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-044", () => {
  it("reduces play cost by suspending an own WG Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ actions: [{ mode: "reduceCost", amount: 4, cost: { kind: "suspend" } }] }] }));
  it("suspends and restricts an opposing Digimon or Tamer on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", target: { filter: { kind: ["Digimon", "Tamer"] } } }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }] });
  });
  it("has once-per-turn WG DNA digivolution responses", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "DnaDigivolve" }] }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "DnaDigivolve" }] }] }));

  it("suspends and restricts an opposing Digimon on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-044", as: "source" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("reduces the play cost by 4 after suspending an own WG Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX9-044", as: "hydra" }], battleArea: [{ card: "EX9-040", as: "wg" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hydra").instanceId }).ok).toBe(true);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-044"));
    expect(before - s.state.memory).toBe(7);
    expect(s.perm("wg").isSuspended).toBe(true);
  });
});

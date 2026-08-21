import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-033.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-033", () => {
  it("gives own Puppet Digimon Alliance and Blocker", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns" && entry.actions.some((action) => action.kind === "GainKeyword"))).toMatchObject({ actions: [{ kind: "GainKeyword", keyword: { keyword: "Alliance" } }, { kind: "GainKeyword", keyword: { keyword: "Blocker" } }] }));
  it("once per turn plays a level 4-or-lower Puppet from trash at end of turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 4 } } } }] }));

  it("grants both keywords to an own Puppet and not an opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-033", as: "source" }, { card: "EX9-024", as: "puppet" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("puppet"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("puppet"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Alliance")).toBe(false);
  });

  it("deletes the opposing lowest-level Digimon when another Digimon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-033", as: "source" }, { card: "EX9-024", as: "other" }] }, 1: { battleArea: [{ card: "BT1-009", as: "lowest" }, { card: "EX9-032", as: "otherOpponent" }] } }, { autoOrderTriggers: true });
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.every((p) => p.topCard.cardId !== "EX9-024"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX9-032")).toBe(true);
  });

  it("plays a level-four-or-lower Puppet from trash at end of turn without cost", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-033", as: "source" }], trash: ["EX9-024"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX9-024"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "EX9-024")).toBe(false);
  });
});
